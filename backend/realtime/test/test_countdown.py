import json
import random
from datetime import timedelta
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.utils.dateparse import parse_datetime
from rest_framework.test import APIClient

from config.asgi import application
from games.deck import start_round
from games.models import SituationCard
from games.voting import CLOSE_AFTER, countdown_mark
from realtime.consumers import room_group_name
from rooms.service import begin_conversation, call_basta, publish_due, raise_hand
from rooms.test.test_hand import playing_room


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


class CountdownTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_the_countdown_advances_once_and_survives_reconnect(self):
        async_to_sync(self._run)()

    async def _run(self):
        room, tokens, game = await database_sync_to_async(playing_room)()
        await database_sync_to_async(start_round)(game, random.Random(1))
        await database_sync_to_async(begin_conversation)(room.code, tokens["Ana"])
        for name in ("Ana", "Luis", "Nora"):
            await database_sync_to_async(raise_hand)(room.code, tokens[name])
        card = await database_sync_to_async(SituationCard.objects.get)(number=1)
        channel = await _subscribe(room.code)
        closed = await database_sync_to_async(call_basta)(room.code, tokens["Otto"])
        phase = (await _receive(channel))["message"]
        countdown = (await _receive(channel))["message"]
        self.assertEqual(phase["type"], "round.phase_changed")
        self.assertEqual(phase["payload"]["status"], "voting")
        self.assertEqual(countdown["type"], "round.countdown")
        self.assertEqual(countdown["payload"]["mark"], 3)
        self.assertEqual(
            set(countdown["payload"]),
            {"code", "number", "mark", "opened_at", "closes_at"},
        )
        self.assertNotIn(card.text, json.dumps(countdown))
        self.assertNotIn("gesture", countdown["payload"])

        opened = closed.vote_opened_at
        later = opened + timedelta(seconds=1)
        marks = await database_sync_to_async(publish_due)(room.code, closed.pk, later)
        self.assertEqual([event[1]["mark"] for event in marks], [2])
        repeated = await database_sync_to_async(publish_due)(
            room.code,
            closed.pk,
            later,
        )
        self.assertEqual(repeated, [])
        closed_marks = await database_sync_to_async(publish_due)(
            room.code,
            closed.pk,
            opened + CLOSE_AFTER,
        )
        self.assertEqual(
            [event[0] for event in closed_marks],
            [
                "round.countdown",
                "round.countdown",
                "round.phase_changed",
                "round.revealed",
            ],
        )
        self.assertEqual([event[1]["mark"] for event in closed_marks[:2]], [1, 0])
        self.assertEqual(closed_marks[2][1]["status"], "finished")
        for row in closed_marks[3][1]["results"]:
            self.assertIsNone(row["gesture"])
            self.assertEqual(row["targets"], [])
            self.assertEqual(row["points"], 0)
        again = await database_sync_to_async(publish_due)(
            room.code,
            closed.pk,
            opened + CLOSE_AFTER,
        )
        self.assertEqual(again, [])

        communicator, snapshot = await self._open(room.code, tokens["Ana"])
        try:
            self.assertEqual(snapshot["type"], "room.snapshot")
            self._silent(communicator)
        finally:
            await communicator.disconnect()
        public = await self._json(f"/api/rooms/{room.code}/round/", tokens["Ana"])
        stored = await self._stored(closed.pk)
        self.assertEqual(parse_datetime(public["vote_opened_at"]), opened)
        self.assertEqual(stored.vote_opened_at, opened)
        self.assertEqual(public["vote_mark"], countdown_mark(stored))
        self.assertEqual(public["status"], "finished")
        self.assertEqual(len(public["results"]), 4)

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = f"token={quote(token)}".encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        return communicator, json.loads(await communicator.receive_from())

    def _silent(self, communicator):
        while not communicator.output_queue.empty():
            message = communicator.output_queue.get_nowait()
            self.assertNotEqual(message["type"], "websocket.send")

    async def _json(self, path, token):
        response = await database_sync_to_async(self.client.get)(
            path,
            {"token": token},
        )
        self.assertEqual(response.status_code, 200, response.json())
        return response.json()

    @database_sync_to_async
    def _stored(self, round_id):
        from games.models import Round

        return Round.objects.get(pk=round_id)
