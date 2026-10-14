import random
import threading

from django.db import connections
from django.test import TestCase, TransactionTestCase

from games.deck import (
    InsufficientCards,
    InvalidParticipants,
    InvalidRoundState,
    create_piles,
    deal_round,
    prepare_round,
    private_hand,
    round_public_view,
    start_round,
)
from games.models import Game, Participant, Round
from games.test.test_deck import make_cards, make_players, prepared_game


def assignment(round_):
    return list(
        round_.dealt_hands.order_by("participant__name").values_list(
            "participant__name",
            "card_copy__card__number",
            "card_copy__copy_number",
        )
    )


class DealRoundTests(TestCase):
    def test_four_players_receive_one_card_and_five_are_discarded(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))

        dealt_ids = set(round_.dealt_hands.values_list("card_copy_id", flat=True))
        discard_ids = set(round_.discards.values_list("card_copy_id", flat=True))

        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertEqual(len(dealt_ids), 4)
        self.assertEqual(len(discard_ids), 5)
        self.assertTrue(dealt_ids.isdisjoint(discard_ids))
        self.assertEqual(len(dealt_ids | discard_ids), 9)

    def test_seven_players_receive_one_card_and_five_are_discarded(self):
        game = prepared_game(7)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))

        self.assertEqual(round_.dealt_hands.count(), 7)
        self.assertEqual(round_.discards.count(), 5)

    def test_five_players_use_three_piles(self):
        game = prepared_game(5)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))

        self.assertEqual(game.piles.count(), 15)
        self.assertEqual(round_.piles.count(), 3)
        self.assertEqual(round_.dealt_hands.count(), 5)
        self.assertEqual(round_.discards.count(), 4)

    def test_six_players_use_three_piles(self):
        game = prepared_game(6)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))

        self.assertEqual(game.piles.count(), 15)
        self.assertEqual(round_.piles.count(), 3)
        self.assertEqual(round_.dealt_hands.count(), 6)
        self.assertEqual(round_.discards.count(), 3)

    def test_eight_players_use_four_piles(self):
        game = prepared_game(8)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))

        self.assertEqual(game.piles.count(), 16)
        self.assertEqual(round_.piles.count(), 4)
        self.assertEqual(round_.dealt_hands.count(), 8)
        self.assertEqual(round_.discards.count(), 4)

    def test_the_same_seed_deals_the_same_cards(self):
        cards = make_cards(15)
        rounds = []
        for _index in range(2):
            game = Game.objects.create()
            make_players(game, 4)
            create_piles(game, cards)
            participants = list(game.participants.order_by("name"))
            rounds.append(prepare_round(game, participants, random.Random(4)))

        self.assertEqual(assignment(rounds[0]), assignment(rounds[1]))

    def test_a_second_deal_does_not_change_the_round(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(2))
        dealt = round_.dealt_hands.count()
        discarded = round_.discards.count()

        with self.assertRaises(InvalidRoundState):
            deal_round(round_, participants, random.Random(2))

        round_.refresh_from_db()
        self.assertEqual(round_.dealt_hands.count(), dealt)
        self.assertEqual(round_.discards.count(), discarded)
        self.assertEqual(round_.status, Round.Status.CONVERSATION)

    def test_a_player_from_another_game_is_rejected(self):
        game = prepared_game(4)
        round_ = start_round(game, random.Random(1))
        other = Game.objects.create()
        outsider = Participant.objects.create(game=other, name="Ajeno")
        participants = list(game.participants.order_by("pk"))
        participants[0] = outsider

        with self.assertRaises(InvalidParticipants):
            deal_round(round_, participants, random.Random(1))

        self.assertEqual(round_.dealt_hands.count(), 0)
        self.assertEqual(round_.discards.count(), 0)
        self.assertEqual(round_.status, Round.Status.PREPARED)

    def test_an_incomplete_player_list_is_rejected(self):
        game = prepared_game(4)
        round_ = start_round(game, random.Random(1))
        participants = list(game.participants.order_by("pk"))[:3]

        with self.assertRaises(InvalidParticipants):
            deal_round(round_, participants, random.Random(1))

        self.assertEqual(round_.dealt_hands.count(), 0)

    def test_a_repeated_player_does_not_deal(self):
        game = prepared_game(4)
        round_ = start_round(game, random.Random(1))
        participants = list(game.participants.order_by("pk"))
        participants.append(participants[0])

        with self.assertRaises(InvalidParticipants):
            deal_round(round_, participants, random.Random(1))

        round_.refresh_from_db()
        self.assertEqual(round_.dealt_hands.count(), 0)
        self.assertEqual(round_.discards.count(), 0)
        self.assertEqual(round_.status, Round.Status.PREPARED)

    def test_a_round_without_enough_cards_is_not_dealt(self):
        game = prepared_game(4)
        round_ = Round.objects.create(game=game, number=1)
        participants = list(game.participants.order_by("pk"))

        with self.assertRaises(InsufficientCards):
            deal_round(round_, participants, random.Random(1))

        self.assertEqual(round_.dealt_hands.count(), 0)
        self.assertEqual(round_.status, Round.Status.PREPARED)

    def test_the_public_view_omits_private_cards(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(3))
        view = round_public_view(round_)

        self.assertEqual(
            set(view),
            {
                "number",
                "status",
                "participant_ids",
                "dealt_count",
                "discard_count",
            },
        )
        self.assertEqual(view["dealt_count"], 4)
        self.assertEqual(view["discard_count"], 5)
        hand = private_hand(round_, participants[0])
        self.assertEqual(
            hand.pk,
            round_.dealt_hands.get(participant=participants[0]).card_copy_id,
        )


class ConcurrentDealTests(TransactionTestCase):
    def test_two_deals_create_one_assignment(self):
        game = prepared_game(4)
        round_ = start_round(game, random.Random(1))
        participants = list(game.participants.order_by("pk"))
        barrier = threading.Barrier(2)
        errors = []

        def attempt():
            try:
                barrier.wait()
                deal_round(round_, participants, random.Random(1))
            except InvalidRoundState as error:
                errors.append(error)
            finally:
                connections.close_all()

        connections.close_all()
        threads = [threading.Thread(target=attempt) for _index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        round_.refresh_from_db()
        self.assertEqual(len(errors), 1)
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertEqual(round_.dealt_hands.count(), 4)
        self.assertEqual(round_.discards.count(), 5)
        self.assertEqual(
            round_.dealt_hands.values("participant_id").distinct().count(),
            4,
        )
