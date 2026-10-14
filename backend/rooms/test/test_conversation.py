import random
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.test import TestCase

from games.deck import GameFinished, InvalidRoundState, start_round
from games.models import Game, SituationCard
from games.rounds import declare_conversation_end, mark_ready
from realtime.consumers import room_group_name
from rooms.service import (
    RoundUnavailable,
    begin_conversation,
    create_room,
    own_card,
    round_state,
)
from rooms.test.test_hand import playing_room

PHASE_FIELDS = {"code", "number", "status", "dealt_count", "discard_count"}


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


class ConversationTests(TestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_a_prepared_round_enters_conversation_once(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(1))
        card = SituationCard.objects.get(number=1)

        with self.captureOnCommitCallbacks(execute=True):
            round_ = begin_conversation(room.code, tokens["Ana"])
            channel = async_to_sync(_subscribe)(room.code)

        event = async_to_sync(_receive)(channel)["message"]
        game.refresh_from_db()
        self.assertEqual(round_.status, "conversation")
        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(game.status, Game.Status.PREPARING)
        self.assertEqual(round_.dealt_hands.count(), 4)
        self.assertEqual(round_.discards.count(), 5)
        self.assertEqual(event["type"], "round.phase_changed")
        self.assertEqual(set(event["payload"]), PHASE_FIELDS)
        self.assertEqual(event["payload"]["status"], "conversation")
        self.assertEqual(event["payload"]["dealt_count"], 4)
        self.assertEqual(event["payload"]["discard_count"], 5)
        self.assertNotIn(card.text, str(event))
        self.assertNotIn(tokens["Ana"], str(event))
        self.assertNotIn(channel, get_channel_layer().channels)

        public = round_state(room.code, tokens["Luis"])
        private = own_card(room.code, tokens["Luis"])
        hand = round_.dealt_hands.get(participant__name="Luis").card_copy.card
        self.assertEqual(public["status"], "conversation")
        self.assertNotIn("text", public)
        self.assertNotIn(private["text"], str(public))
        self.assertEqual(private, {"number": hand.number, "text": hand.text})

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            again = begin_conversation(room.code, tokens["Otto"])

        self.assertEqual(callbacks, [])
        self.assertEqual(again.pk, round_.pk)
        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(again.dealt_hands.count(), 4)

    def test_an_unauthorized_token_does_not_open_conversation(self):
        room, tokens, game = playing_room()
        prepared = start_round(game, random.Random(2))
        stranger = create_room("Sara")
        texts = list(SituationCard.objects.values_list("text", flat=True))

        for token in (
            "",
            str(game.participants.get(name="Ana").pk),
            stranger.access_token,
        ):
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                with self.assertRaises(RoundUnavailable) as raised:
                    begin_conversation(room.code, token)
            self.assertEqual(callbacks, [])
            for text in texts:
                self.assertNotIn(text, str(raised.exception))
            with self.assertRaises(RoundUnavailable):
                round_state(room.code, token)

        prepared.refresh_from_db()
        self.assertEqual(prepared.status, "prepared")
        self.assertEqual(prepared.dealt_hands.count(), 0)
        self.assertEqual(game.rounds.count(), 1)

    def test_a_finished_game_and_a_voting_round_stay_unchanged(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(3))
        game.status = Game.Status.FINISHED
        game.save()

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(GameFinished):
                begin_conversation(room.code, tokens["Ana"])
        self.assertEqual(callbacks, [])
        self.assertEqual(game.rounds.filter(status="prepared").count(), 1)
        self.assertEqual(game.consumed_piles.count(), 3)

        game.status = Game.Status.PREPARING
        game.save()
        with self.captureOnCommitCallbacks(execute=True):
            round_ = begin_conversation(room.code, tokens["Ana"])
        participants = list(game.participants.order_by("pk"))
        for participant in participants[:3]:
            mark_ready(round_, participant)
        declare_conversation_end(round_, participants[3])

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(InvalidRoundState):
                begin_conversation(room.code, tokens["Ana"])

        round_.refresh_from_db()
        self.assertEqual(callbacks, [])
        self.assertEqual(round_.status, "voting")
        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(round_.dealt_hands.count(), 4)

    def test_a_publish_failure_keeps_the_conversation(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(4))

        class BrokenLayer:
            async def group_send(self, group, message):
                raise ConnectionError("redis no disponible")

        with self.assertLogs("realtime.publish", level="ERROR"):
            with patch(
                "realtime.publish.get_channel_layer",
                return_value=BrokenLayer(),
            ):
                with self.captureOnCommitCallbacks(execute=True):
                    round_ = begin_conversation(room.code, tokens["Ana"])

        round_.refresh_from_db()
        hand = round_.dealt_hands.get(participant__name="Ana").card_copy.card
        self.assertEqual(round_.status, "conversation")
        self.assertEqual(round_.dealt_hands.count(), 4)
        self.assertEqual(
            own_card(room.code, tokens["Ana"]),
            {
                "number": hand.number,
                "text": hand.text,
            },
        )
