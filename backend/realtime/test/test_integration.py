import json
from unittest.mock import patch
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from config.asgi import application
from games.models import Game, SituationCard
from realtime.consumers import room_group_name
from rooms.models import Room
from rooms.service import start_game

PUBLIC_FIELDS = {
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
}


class BrokenLayer:
    async def group_send(self, group, message):
        raise ConnectionError("redis no disponible")


class WebsocketIntegrationTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_authorized_players_receive_public_room_events(self):
        card = SituationCard.objects.create(number=81, text="Una carta secreta")

        async_to_sync(self._play)(card)

    def test_rooms_and_unauthorized_sockets_stay_isolated(self):
        async_to_sync(self._isolate)()

    def test_a_rejected_join_publishes_nothing_to_open_sockets(self):
        async_to_sync(self._reject_duplicate)()

    def test_rest_works_without_sockets(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]
        joined = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Luis"},
            format="json",
        )
        fetched = self.client.get(f"/api/rooms/{code}/")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(joined.status_code, 201)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["participants"], ["Ana", "Luis"])
        self.assertEqual(set(fetched.json()), PUBLIC_FIELDS)
        self.assertEqual(Room.objects.get(code=code).members.count(), 2)
        self.assertNotIn(room_group_name(code), get_channel_layer().groups)

    def test_reconnect_and_an_invalid_message_keep_the_member(self):
        async_to_sync(self._reconnect)()

    def test_a_publish_failure_keeps_the_join_visible_over_rest(self):
        async_to_sync(self._publish_fails)()

    async def _play(self, card):
        ana = await self._create("Ana")
        luis = await self._join(ana["code"], "Luis")
        code = ana["code"]
        ana_socket, ana_snapshot = await self._open(code, ana["token"])
        luis_socket, luis_snapshot = await self._open(code, luis["token"])
        try:
            self._assert_public(ana_snapshot, card, ana["token"])
            self._assert_public(luis_snapshot, card, luis["token"])
            self.assertEqual(ana_snapshot["payload"]["participants"], ["Ana", "Luis"])
            self.assertEqual(luis_snapshot["type"], "room.snapshot")

            await self._join(code, "Nora")
            for socket in (ana_socket, luis_socket):
                joined = await self._next(socket)
                self.assertEqual(joined["type"], "room.player_joined")
                self.assertEqual(joined["payload"]["name"], "Nora")
                self.assertEqual(joined["payload"]["player_count"], 3)
                self._assert_public(joined, card, ana["token"], extra="name")
                self._silent(socket)

            await self._join(code, "Otto")
            for socket in (ana_socket, luis_socket):
                joined = await self._next(socket)
                changed = await self._next(socket)
                self.assertEqual(joined["type"], "room.player_joined")
                self.assertEqual(joined["payload"]["name"], "Otto")
                self.assertEqual(changed["type"], "room.state_changed")
                self.assertTrue(changed["payload"]["can_start"])
                self.assertEqual(changed["payload"]["player_count"], 4)
                self._assert_public(joined, card, ana["token"], extra="name")
                self._assert_public(changed, card, ana["token"])

            await database_sync_to_async(start_game)(code, "Ana")
            for socket in (ana_socket, luis_socket):
                started = await self._next(socket)
                changed = await self._next(socket)
                self.assertEqual(started["type"], "game.started")
                self.assertEqual(started["payload"]["status"], Room.Status.STARTED)
                self.assertEqual(changed["type"], "room.state_changed")
                self.assertFalse(changed["payload"]["accepting_members"])
                self._assert_public(started, card, ana["token"])
                self._assert_public(changed, card, luis["token"])
        finally:
            await ana_socket.disconnect()
            await luis_socket.disconnect()

        self.assertEqual(await self._count(Game.objects.count), 1)
        self.assertEqual(await self._members(code), 4)

    async def _isolate(self):
        home = await self._create("Ana")
        other = await self._create("Luis")
        home_socket, _snapshot = await self._open(home["code"], home["token"])
        other_socket, _other = await self._open(other["code"], other["token"])
        stranger = await self._reject(home["code"], "name=Ana&player_id=9")
        try:
            await self._join(home["code"], "Nora")
            joined = await self._next(home_socket)
            self.assertEqual(joined["type"], "room.player_joined")
            self.assertEqual(joined["payload"]["code"], home["code"])
            self._silent(other_socket)
            self._silent(stranger)
        finally:
            await home_socket.disconnect()
            await other_socket.disconnect()
            await stranger.disconnect()

        self.assertEqual(joined["payload"]["participants"], ["Ana", "Nora"])
        self.assertNotIn("token", joined["payload"])

    async def _reject_duplicate(self):
        ana = await self._create("Ana")
        luis = await self._join(ana["code"], "Luis")
        ana_socket, _snapshot = await self._open(ana["code"], ana["token"])
        luis_socket, _other = await self._open(ana["code"], luis["token"])
        try:
            rejected = await self._join(ana["code"], "Luis", status=409)
            self.assertEqual(rejected["code"], "duplicate_member")
            self._silent(ana_socket)
            self._silent(luis_socket)
        finally:
            await ana_socket.disconnect()
            await luis_socket.disconnect()

        self.assertEqual(await self._members(ana["code"]), 2)

    async def _reconnect(self):
        ana = await self._create("Ana")
        socket, first = await self._open(ana["code"], ana["token"])
        await socket.disconnect()
        socket, second = await self._open(ana["code"], ana["token"])
        try:
            self.assertEqual(first["type"], "room.snapshot")
            self.assertEqual(second["type"], "room.snapshot")
            self.assertEqual(second["payload"]["participants"], ["Ana"])
            await socket.send_json_to({"type": "room.join", "payload": {}})
            rejected = await self._next(socket)
            self.assertEqual(rejected["payload"]["code"], "unknown_type")
            self.assertEqual(set(rejected["payload"]), {"code", "detail"})
        finally:
            await socket.disconnect()

        self.assertEqual(await self._members(ana["code"]), 1)

    async def _publish_fails(self):
        ana = await self._create("Ana")
        socket, _snapshot = await self._open(ana["code"], ana["token"])
        try:
            with self.assertLogs("realtime.publish", level="ERROR"):
                with patch(
                    "realtime.publish.get_channel_layer",
                    return_value=BrokenLayer(),
                ):
                    joined = await self._join(ana["code"], "Luis")
            self.assertEqual(joined["participants"], ["Ana", "Luis"])
            self._silent(socket)
            fetched = await database_sync_to_async(self.client.get)(
                f"/api/rooms/{ana['code']}/"
            )
            self.assertEqual(fetched.status_code, 200)
            self.assertEqual(fetched.json()["participants"], ["Ana", "Luis"])
            self.assertNotIn("token", fetched.json())
        finally:
            await socket.disconnect()

        socket, snapshot = await self._open(ana["code"], ana["token"])
        try:
            self.assertEqual(snapshot["payload"]["participants"], ["Ana", "Luis"])
            self.assertNotIn("token", snapshot["payload"])
        finally:
            await socket.disconnect()

        self.assertEqual(await self._members(ana["code"]), 2)

    async def _members(self, code):
        def count():
            return Room.objects.get(code=code).members.count()

        return await database_sync_to_async(count)()

    async def _count(self, query):
        return await database_sync_to_async(query)()

    async def _create(self, name):
        response = await database_sync_to_async(self.client.post)(
            "/api/rooms/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    async def _join(self, code, name, status=201):
        response = await database_sync_to_async(self.client.post)(
            f"/api/rooms/{code}/members/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, status)
        return response.json()

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = f"token={quote(token)}".encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = json.loads(await communicator.receive_from())
        self.assertNotIn(token, json.dumps(event))
        return communicator, event

    async def _reject(self, code, query):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = query.encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = json.loads(await communicator.receive_from())
        self.assertEqual(event["payload"]["code"], "unauthorized")
        self.assertEqual(set(event["payload"]), {"code", "detail"})
        return communicator

    async def _next(self, communicator):
        return json.loads(await communicator.receive_from())

    def _silent(self, communicator):
        while not communicator.output_queue.empty():
            message = communicator.output_queue.get_nowait()
            self.assertNotEqual(message["type"], "websocket.send")

    def _assert_public(self, event, card, token, extra=None):
        payload = event["payload"]
        fields = set(PUBLIC_FIELDS)
        if extra:
            fields.add(extra)
        self.assertEqual(set(payload), fields)
        rendered = json.dumps(event)
        self.assertNotIn(card.text, rendered)
        self.assertNotIn(token, rendered)
        self.assertNotIn("role", payload)
        self.assertNotIn("vote", payload)
        self.assertNotIn("pk", payload)
