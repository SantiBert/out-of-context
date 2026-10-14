import random

from django.test import TestCase

from games.deck import create_piles, deal_round, round_public_view, start_round
from games.models import Game, SituationCard
from games.rounds import declare_conversation_end, mark_ready
from games.test.test_deck import finish_round, make_cards
from rooms.service import (
    CardUnavailable,
    create_room,
    get_room_state,
    join_room,
    own_card,
    start_game,
)


def playing_room():
    room = create_room("Ana")
    tokens = {"Ana": room.access_token}
    for name in ("Luis", "Nora", "Otto"):
        member = join_room(room.code, name)
        tokens[name] = member.access_token
    game = start_game(room.code, "Ana")
    create_piles(game, make_cards(15))
    return room, tokens, game


def deal(game, seed):
    participants = list(game.participants.order_by("pk"))
    round_ = start_round(game, random.Random(seed))
    return deal_round(round_, participants, random.Random(seed))


class OwnCardTests(TestCase):
    def test_each_token_reads_only_its_own_card(self):
        room, tokens, game = playing_room()
        round_ = deal(game, 1)

        for name, token in tokens.items():
            hand = round_.dealt_hands.get(participant__name=name)
            card = hand.card_copy.card
            view = own_card(room.code, token)

            self.assertEqual(view, {"number": card.number, "text": card.text})
            self.assertNotIn(token, str(view))
            for other in SituationCard.objects.exclude(pk=card.pk):
                self.assertNotIn(other.text, str(view))

        public = round_public_view(round_)
        state = get_room_state(room.code)
        rendered = f"{public}{state}"
        self.assertNotIn("text", public)
        self.assertFalse({"teams", "impostors", "role", "card"} & set(public))
        for card in SituationCard.objects.all():
            self.assertNotIn(card.text, rendered)

    def test_a_player_id_or_a_foreign_token_reads_nothing(self):
        room, tokens, game = playing_room()
        round_ = deal(game, 2)
        ana = game.participants.get(name="Ana")
        other = create_room("Sara")
        texts = list(SituationCard.objects.values_list("text", flat=True))

        for token in ("", str(ana.pk), other.access_token, tokens["Luis"][::-1]):
            with self.assertRaises(CardUnavailable) as raised:
                own_card(room.code, token)
            for text in texts:
                self.assertNotIn(text, str(raised.exception))

        self.assertEqual(round_.dealt_hands.count(), 4)

    def test_an_undealt_or_finished_round_has_no_card(self):
        room, tokens, game = playing_room()
        prepared = start_round(game, random.Random(3))

        with self.assertRaises(CardUnavailable):
            own_card(room.code, tokens["Ana"])

        self.assertEqual(prepared.dealt_hands.count(), 0)
        dealt = deal_round(
            prepared,
            list(game.participants.order_by("pk")),
            random.Random(3),
        )
        visible = own_card(room.code, tokens["Ana"])
        finish_round(dealt)

        with self.assertRaises(CardUnavailable):
            own_card(room.code, tokens["Ana"])

        self.assertNotIn(visible["text"], str(get_room_state(room.code)))

    def test_voting_keeps_the_same_private_card(self):
        room, tokens, game = playing_room()
        round_ = deal(game, 4)
        participants = list(game.participants.order_by("pk"))
        expected = own_card(room.code, tokens["Ana"])
        for participant in participants[:3]:
            mark_ready(round_, participant)
        declare_conversation_end(round_, participants[3])

        round_.refresh_from_db()
        self.assertEqual(round_.status, "voting")
        self.assertEqual(own_card(room.code, tokens["Ana"]), expected)
        self.assertEqual(game.status, Game.Status.PREPARING)

    def test_the_open_round_replaces_a_finished_hand(self):
        room, tokens, game = playing_room()
        first = deal(game, 5)
        ana = game.participants.get(name="Ana")
        first_card = first.dealt_hands.get(participant=ana).card_copy.card
        finish_round(first)
        second = deal(game, 6)
        second_card = second.dealt_hands.get(participant=ana).card_copy.card

        view = own_card(room.code, tokens["Ana"])

        self.assertEqual(view, {"number": second_card.number, "text": second_card.text})
        if first_card.pk != second_card.pk:
            self.assertNotIn(first_card.text, str(view))
