import json
import random
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from config.asgi import application
from games.deck import create_piles, start_round
from games.test.test_deck import make_cards
from rooms.service import begin_conversation, start_game

PUBLIC_ROUND = {
    "number",
    "status",
    "participant_ids",
    "dealt_count",
    "discard_count",
    "ready_count",
    "ready",
    "vote_opened_at",
    "vote_closes_at",
    "vote_mark",
}


class RoundFlowTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_rest_and_commands_keep_the_card_private(self):
        async_to_sync(self._flow)()

    def test_a_raise_before_conversation_is_rejected(self):
        async_to_sync(self._too_early)()

    def test_a_missing_round_and_a_foreign_token_are_rejected(self):
        async_to_sync(self._missing)()

    async def _flow(self):
        ana = await self._create("Ana")
        code = ana["code"]
        luis = await self._join(code, "Luis")
        nora = await self._join(code, "Nora")
        otto = await self._join(code, "Otto")
        other = await self._create("Sara")
        await self._conversation(code, ana["token"])

        room = await self._json(f"/api/rooms/{code}/")
        ana_card = await self._json(f"/api/rooms/{code}/card/", ana["token"])
        public = await self._json(f"/api/rooms/{code}/round/", luis["token"])
        self.assertEqual(
            set(room),
            {
                "code",
                "status",
                "host",
                "participants",
                "player_count",
                "accepting_members",
                "can_start",
            },
        )
        self.assertNotIn(ana_card["text"], json.dumps(room))
        self.assertEqual(set(ana_card), {"number", "text"})
        self.assertEqual(set(public), PUBLIC_ROUND)
        self.assertEqual(public["status"], "conversation")
        self.assertEqual(public["ready"], [])
        self.assertNotIn(ana_card["text"], json.dumps(public))

        ana_socket, snapshot = await self._open(code, ana["token"])
        luis_socket, _luis_snapshot = await self._open(code, luis["token"])
        other_socket, _other_snapshot = await self._open(other["code"], other["token"])
        try:
            self.assertEqual(snapshot["type"], "room.snapshot")
            self.assertNotIn(ana_card["text"], json.dumps(snapshot))

            await ana_socket.send_json_to(
                {"type": "round.raise_hand", "payload": {}},
            )
            raised = await self._next(ana_socket)
            luis_raised = await self._next(luis_socket)
            self.assertEqual(raised["type"], "round.hand_raised")
            self.assertEqual(raised, luis_raised)
            self.assertEqual(raised["payload"]["name"], "Ana")
            self.assertEqual(raised["payload"]["ready_count"], 1)
            self.assertNotIn(ana_card["text"], json.dumps(raised))
            self._silent(other_socket)

            await ana_socket.send_json_to({"type": "round.basta", "payload": {}})
            early = await self._next(ana_socket)
            self.assertEqual(early["type"], "connection.error")
            self.assertEqual(early["payload"]["code"], "not_ready")
            self._silent(luis_socket)
            self.assertEqual(
                (await self._json(f"/api/rooms/{code}/round/", ana["token"]))["status"],
                "conversation",
            )

            await self._raise(code, luis["token"], ana_socket, luis_socket)
            await self._raise(code, nora["token"], ana_socket, luis_socket)
            otto_socket, _snapshot = await self._open(code, otto["token"])
            try:
                await otto_socket.send_json_to(
                    {"type": "round.basta", "payload": {}},
                )
                closed = await self._next(otto_socket)
                ana_closed = await self._next(ana_socket)
                luis_closed = await self._next(luis_socket)
            finally:
                await otto_socket.disconnect()
            self.assertEqual(closed["type"], "round.phase_changed")
            self.assertEqual(closed, ana_closed)
            self.assertEqual(closed, luis_closed)
            self.assertEqual(closed["payload"]["status"], "voting")
            self.assertNotIn(ana_card["text"], json.dumps(closed))
            countdown = await self._next(ana_socket)
            luis_countdown = await self._next(luis_socket)
            self.assertEqual(countdown["type"], "round.countdown")
            self.assertEqual(countdown["payload"]["mark"], 3)
            self.assertEqual(countdown, luis_countdown)
            self.assertNotIn(ana_card["text"], json.dumps(countdown))
            self.assertNotIn("gesture", countdown["payload"])
            self._silent(other_socket)

            await ana_socket.send_json_to(
                {
                    "type": "round.hand_raised",
                    "payload": {
                        "code": code,
                        "number": 1,
                        "name": "Ana",
                        "ready_count": 4,
                        "player_count": 4,
                    },
                },
            )
            rejected = await self._next(ana_socket)
            self.assertEqual(rejected["payload"]["code"], "server_only")
            await ana_socket.send_json_to(
                {"type": "round.raise_hand", "payload": {}},
            )
            blocked = await self._next(ana_socket)
            self.assertEqual(blocked["payload"]["code"], "invalid_round")
            recovered = await self._json(f"/api/rooms/{code}/round/", ana["token"])
            self.assertEqual(recovered["status"], "voting")
            self.assertEqual(recovered["ready_count"], 3)
            self.assertEqual(recovered["ready"], ["Ana", "Luis", "Nora"])
            self.assertNotIn("Otto", recovered["ready"])

            await ana_socket.disconnect()
            ana_socket = None
            again = await self._json(f"/api/rooms/{code}/card/", ana["token"])
            self.assertEqual(again, ana_card)
            reopened, reopened_snapshot = await self._open(code, ana["token"])
            self.assertEqual(reopened_snapshot["type"], "room.snapshot")
            self.assertNotIn(again["text"], json.dumps(reopened_snapshot))
            await reopened.disconnect()
        finally:
            if ana_socket is not None:
                await ana_socket.disconnect()
            await luis_socket.disconnect()
            await other_socket.disconnect()

    async def _too_early(self):
        ana = await self._create("Ana")
        code = ana["code"]
        for name in ("Luis", "Nora", "Otto"):
            await self._join(code, name)
        await self._prepare(code)
        communicator, _snapshot = await self._open(code, ana["token"])
        try:
            await communicator.send_json_to(
                {"type": "round.raise_hand", "payload": {}},
            )
            event = await self._next(communicator)
            public = await self._json(f"/api/rooms/{code}/round/", ana["token"])
            card = await self._response(f"/api/rooms/{code}/card/", ana["token"])
            self.assertEqual(event["payload"]["code"], "invalid_round")
            self.assertEqual(public["status"], "prepared")
            self.assertEqual(public["ready_count"], 0)
            self.assertEqual(card.status_code, 404)
            self.assertEqual(card.json()["code"], "card_unavailable")
        finally:
            await communicator.disconnect()

    async def _missing(self):
        ana = await self._create("Ana")
        code = ana["code"]
        for name in ("Luis", "Nora", "Otto"):
            await self._join(code, name)
        other = await self._create("Sara")
        await database_sync_to_async(start_game)(code, "Ana")

        missing_round = await self._response(f"/api/rooms/{code}/round/", ana["token"])
        missing_card = await self._response(f"/api/rooms/{code}/card/", ana["token"])
        foreign = await self._response(f"/api/rooms/{code}/card/", other["token"])
        absent = await self._response("/api/rooms/ZZZZZZ/round/", ana["token"])
        self.assertEqual(missing_round.status_code, 404)
        self.assertEqual(missing_round.json()["code"], "round_unavailable")
        self.assertEqual(missing_card.status_code, 404)
        self.assertEqual(missing_card.json()["code"], "card_unavailable")
        self.assertEqual(foreign.status_code, 401)
        self.assertEqual(foreign.json()["code"], "unauthorized")
        self.assertEqual(absent.status_code, 404)
        self.assertEqual(absent.json()["code"], "room_not_found")

        communicator, _snapshot = await self._open(code, ana["token"])
        try:
            await communicator.send_json_to(
                {"type": "round.basta", "payload": {}},
            )
            event = await self._next(communicator)
            self.assertEqual(event["payload"]["code"], "round_unavailable")
            self.assertEqual(set(event["payload"]), {"code", "detail"})
        finally:
            await communicator.disconnect()

    async def _raise(self, code, token, *listeners):
        communicator, _snapshot = await self._open(code, token)
        try:
            await communicator.send_json_to(
                {"type": "round.raise_hand", "payload": {}},
            )
            await self._next(communicator)
            for listener in listeners:
                event = await self._next(listener)
                self.assertEqual(event["type"], "round.hand_raised")
        finally:
            await communicator.disconnect()

    async def _create(self, name):
        response = await database_sync_to_async(self.client.post)(
            "/api/rooms/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    async def _join(self, code, name):
        response = await database_sync_to_async(self.client.post)(
            f"/api/rooms/{code}/members/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    async def _response(self, path, token=None):
        params = {"token": token} if token is not None else None
        return await database_sync_to_async(self.client.get)(path, params)

    async def _json(self, path, token=None):
        response = await self._response(path, token)
        self.assertEqual(response.status_code, 200, response.json())
        return response.json()

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = f"token={quote(token)}".encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = await self._next(communicator)
        self.assertNotIn(token, json.dumps(event))
        return communicator, event

    async def _next(self, communicator):
        return json.loads(await communicator.receive_from())

    def _silent(self, communicator):
        while not communicator.output_queue.empty():
            message = communicator.output_queue.get_nowait()
            self.assertNotEqual(message["type"], "websocket.send")

    @database_sync_to_async
    def _conversation(self, code, token):
        game = start_game(code, "Ana")
        create_piles(game, make_cards(15))
        start_round(game, random.Random(1))
        begin_conversation(code, token)

    @database_sync_to_async
    def _prepare(self, code):
        game = start_game(code, "Ana")
        create_piles(game, make_cards(15))
        start_round(game, random.Random(1))
