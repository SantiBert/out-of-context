import random

from django.test import TestCase

from games.deck import (
    InvalidRoundState,
    RoundStillOpen,
    deck_config,
    prepare_round,
    start_round,
)
from games.models import Game, Participant, Round
from games.rounds import (
    NotInGame,
    NotReadyToClose,
    declare_conversation_end,
    mark_ready,
)
from games.test.test_deck import prepared_game


def conversation(player_count, start=1):
    game = prepared_game(player_count, start=start)
    participants = list(game.participants.order_by("pk"))
    round_ = prepare_round(game, participants, random.Random(1))
    return round_, participants


class OpenRoundTests(TestCase):
    def test_a_new_round_waits_until_the_previous_one_is_finished(self):
        game = prepared_game(4)
        first = start_round(game, random.Random(1))

        for status in (
            Round.Status.PREPARED,
            Round.Status.CONVERSATION,
            Round.Status.VOTING,
        ):
            first.status = status
            first.save(update_fields=["status"])
            with self.assertRaises(RoundStillOpen):
                start_round(game, random.Random(2))
            self.assertEqual(game.rounds.count(), 1)

        first.status = Round.Status.FINISHED
        first.save(update_fields=["status"])
        second = start_round(game, random.Random(2))

        self.assertEqual(second.number, 2)
        self.assertEqual(second.status, Round.Status.PREPARED)
        self.assertTrue(
            set(first.piles.values_list("card_id", flat=True)).isdisjoint(
                second.piles.values_list("card_id", flat=True)
            )
        )


class ConversationCloseTests(TestCase):
    def test_ready_can_be_marked_once_during_conversation(self):
        round_, participants = conversation(4)

        mark_ready(round_, participants[0])
        mark_ready(round_, participants[0])

        round_.refresh_from_db()
        self.assertEqual(round_.readies.count(), 1)
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertEqual(round_.votes.count(), 0)

    def test_four_players_need_three_ready_hands(self):
        round_, participants = conversation(4)
        for participant in participants[:2]:
            mark_ready(round_, participant)

        with self.assertRaises(NotReadyToClose):
            declare_conversation_end(round_, participants[3])

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        mark_ready(round_, participants[2])
        closed = declare_conversation_end(round_, participants[3])
        repeated = declare_conversation_end(round_, participants[0])

        closed.refresh_from_db()
        self.assertEqual(closed.status, Round.Status.VOTING)
        self.assertEqual(repeated.pk, closed.pk)
        self.assertEqual(closed.votes.count(), 0)
        self.assertEqual(closed.readies.count(), 3)
        with self.assertRaises(InvalidRoundState):
            mark_ready(closed, participants[3])

    def test_five_players_need_three_ready_hands(self):
        round_, participants = conversation(5)
        for participant in participants[:2]:
            mark_ready(round_, participant)

        with self.assertRaises(NotReadyToClose):
            declare_conversation_end(round_, participants[0])

        mark_ready(round_, participants[2])
        declare_conversation_end(round_, participants[4])

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.VOTING)
        self.assertEqual(round_.votes.count(), 0)

    def test_six_to_eight_players_close_only_past_half(self):
        card_start = 1
        for player_count, needed in ((6, 4), (7, 4), (8, 5)):
            with self.subTest(player_count=player_count):
                round_, participants = conversation(player_count, start=card_start)
                card_start += deck_config(player_count).pile_count
                for participant in participants[: needed - 1]:
                    mark_ready(round_, participant)

                with self.assertRaises(NotReadyToClose):
                    declare_conversation_end(round_, participants[-1])

                mark_ready(round_, participants[needed - 1])
                declare_conversation_end(round_, participants[-1])

                round_.refresh_from_db()
                self.assertEqual(round_.status, Round.Status.VOTING)
                self.assertEqual(round_.readies.count(), needed)
                self.assertEqual(round_.votes.count(), 0)

    def test_ready_and_close_are_rejected_outside_conversation(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = start_round(game, random.Random(1))

        with self.assertRaises(InvalidRoundState):
            mark_ready(round_, participants[0])
        with self.assertRaises(InvalidRoundState):
            declare_conversation_end(round_, participants[0])

        round_.status = Round.Status.FINISHED
        round_.save(update_fields=["status"])
        with self.assertRaises(InvalidRoundState):
            mark_ready(round_, participants[0])
        with self.assertRaises(InvalidRoundState):
            declare_conversation_end(round_, participants[0])

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.FINISHED)
        self.assertEqual(round_.readies.count(), 0)
        self.assertEqual(round_.votes.count(), 0)

    def test_someone_outside_the_game_changes_nothing(self):
        round_, _participants = conversation(4)
        other = Game.objects.create()
        stranger = Participant.objects.create(game=other, name="Ajeno")

        with self.assertRaises(NotInGame):
            mark_ready(round_, stranger)
        with self.assertRaises(NotInGame):
            declare_conversation_end(round_, stranger)

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertEqual(round_.readies.count(), 0)
        self.assertEqual(round_.votes.count(), 0)
