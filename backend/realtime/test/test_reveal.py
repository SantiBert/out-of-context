import json
import random
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from games.deck import start_round
from games.models import ScoreAward
from realtime.consumers import room_group_name
from realtime.serializers import encode_server_event
from rooms.service import (
    begin_conversation,
    call_basta,
    cast_vote,
    get_room_state,
    publish_due,
    raise_hand,
)
from rooms.test.test_hand import playing_room


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


def _cast_ballot(room, tokens, round_):
    hands = round_.dealt_hands.select_related("participant", "card_copy")
    groups = {}
    for hand in hands:
        groups.setdefault(hand.card_copy.card_id, []).append(hand.participant)
    for group in groups.values():
        if len(group) == 1:
            cast_vote(room.code, tokens[group[0].name], "fist", [])
            continue
        for player in group:
            targets = [other.name for other in group if other != player]
            cast_vote(room.code, tokens[player.name], "point", targets)


class RevealTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_mark_zero_reveals_a_complete_ballot_once(self):
        async_to_sync(self._run)()

    async def _run(self):
        room, tokens, game = await database_sync_to_async(playing_room)()
        await database_sync_to_async(start_round)(game, random.Random(1))
        await database_sync_to_async(begin_conversation)(room.code, tokens["Ana"])
        for name in ("Ana", "Luis", "Nora"):
            await database_sync_to_async(raise_hand)(room.code, tokens[name])
        channel = await _subscribe(room.code)
        closed = await database_sync_to_async(call_basta)(room.code, tokens["Otto"])
        phase = (await _receive(channel))["message"]
        countdown = (await _receive(channel))["message"]
        self.assertEqual(phase["payload"]["status"], "voting")
        self.assertEqual(countdown["payload"]["mark"], 3)

        closed.vote_closes_at = timezone.now() + timedelta(minutes=5)
        await database_sync_to_async(closed.save)(update_fields=["vote_closes_at"])
        await database_sync_to_async(_cast_ballot)(room, tokens, closed)
        secret = await database_sync_to_async(
            lambda: (
                closed.dealt_hands.select_related("card_copy__card")
                .first()
                .card_copy.card
            )
        )()
        hidden = await self._json(f"/api/rooms/{room.code}/round/", tokens["Ana"])
        self.assertNotIn("results", hidden)
        self.assertNotIn("gesture", hidden)
        self.assertNotIn(secret.text, json.dumps(hidden, ensure_ascii=False))
        self.assertNotIn("gesture", countdown["payload"])

        events = await database_sync_to_async(publish_due)(
            room.code,
            closed.pk,
            closed.vote_closes_at,
        )
        self.assertEqual(
            [event[0] for event in events],
            [
                "round.countdown",
                "round.countdown",
                "round.countdown",
                "round.phase_changed",
                "round.revealed",
            ],
        )
        self.assertEqual([event[1]["mark"] for event in events[:3]], [2, 1, 0])
        finished = events[3][1]
        revealed = events[4][1]
        self.assertEqual(
            set(finished),
            {"code", "number", "status", "dealt_count", "discard_count"},
        )
        self.assertEqual(finished["status"], "finished")
        self.assertNotIn(secret.text, json.dumps(finished))
        encode_server_event("round.revealed", revealed)
        published = (await _receive(channel))["message"]
        while published["type"] != "round.revealed":
            published = (await _receive(channel))["message"]
        self.assertEqual(published["type"], "round.revealed")
        self.assertEqual(revealed["code"], room.code)
        self.assertIn(
            secret.text,
            [row["card"]["text"] for row in revealed["results"]],
        )
        self.assertNotIn("pk", json.dumps(revealed))

        again = await database_sync_to_async(publish_due)(
            room.code,
            closed.pk,
            closed.vote_closes_at,
        )
        self.assertEqual(again, [])
        awards = await database_sync_to_async(
            lambda: ScoreAward.objects.filter(round=closed).count()
        )()
        self.assertEqual(awards, 4)
        public = await self._json(f"/api/rooms/{room.code}/round/", tokens["Ana"])
        self.assertEqual(public["status"], "finished")
        self.assertEqual(
            [row["name"] for row in public["results"]],
            ["Ana", "Luis", "Nora", "Otto"],
        )
        room_body = await database_sync_to_async(
            lambda: get_room_state(room.code)._asdict()
        )()
        self.assertNotIn("results", room_body)
        self.assertNotIn(secret.text, json.dumps(room_body, ensure_ascii=False))

    async def _json(self, path, token):
        response = await database_sync_to_async(self.client.get)(
            path,
            {"token": token},
        )
        self.assertEqual(response.status_code, 200, response.json())
        return response.json()
