import json
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from config.asgi import application
from games.models import Game
from realtime.consumers import room_group_name
from rooms.models import MIN_ROOM_MEMBERS, Room
from rooms.service import create_room, join_room, leave_room, start_game

PUBLIC_FIELDS = {
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
}


class ReconnectTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_disconnect_keeps_the_member_and_leaves_the_group(self):
        room = create_room("Ana")

        async_to_sync(self._open_and_close)(room.code, room.access_token)

        room.refresh_from_db()
        self.assertEqual(room.members.count(), 1)
        self.assertIsNone(room.game_id)
        self.assertNotIn(room_group_name(room.code), get_channel_layer().groups)

    def test_reconnect_sends_a_snapshot_and_does_not_duplicate_members(self):
        room = create_room("Ana")
        join_room(room.code, "Luis")

        first, second = async_to_sync(self._reconnect)(room.code, room.access_token)

        self.assertEqual(first["type"], "room.snapshot")
        self.assertEqual(second["type"], "room.snapshot")
        self.assertEqual(set(first["payload"]), PUBLIC_FIELDS)
        self.assertNotIn("token", first["payload"])
        self.assertEqual(second["payload"]["participants"], ["Ana", "Luis"])
        self.assertEqual(second["payload"]["player_count"], 2)
        self.assertEqual(room.members.count(), 2)

    def test_a_name_or_player_id_stays_out_of_the_group(self):
        room = create_room("Ana")
        query = f"name={room.members.get().name}&player_id=9&group=room.OTHER"

        event = async_to_sync(self._fail)(room.code, query)

        self.assertEqual(event["payload"]["code"], "unauthorized")
        self.assertNotIn(room_group_name(room.code), get_channel_layer().groups)
        self.assertNotIn("room.OTHER", get_channel_layer().groups)

    def test_a_token_from_another_room_does_not_join(self):
        first = create_room("Ana")
        second = create_room("Luis")

        event = async_to_sync(self._fail)(
            second.code,
            f"token={quote(first.access_token)}&group=room.{first.code}",
        )

        self.assertEqual(event["payload"]["code"], "unauthorized")
        self.assertEqual(second.members.count(), 1)
        self.assertNotIn(room_group_name(second.code), get_channel_layer().groups)
        self.assertNotIn(room_group_name(first.code), get_channel_layer().groups)

    def test_a_client_message_does_not_create_members(self):
        room = create_room("Ana")

        async_to_sync(self._reject_messages)(room.code, room.access_token)

        self.assertEqual(room.members.count(), 1)
        self.assertIsNone(room.game_id)

    def test_a_token_is_useless_after_the_member_leaves(self):
        room = create_room("Ana")
        member = join_room(room.code, "Luis")

        event = async_to_sync(self._leave_while_connected)(
            room.code,
            member.access_token,
        )

        self.assertEqual(event["payload"]["code"], "unauthorized")
        self.assertFalse(room.members.filter(name="Luis").exists())
        again = async_to_sync(self._fail)(
            room.code,
            f"token={quote(member.access_token)}",
        )
        self.assertEqual(again["payload"]["code"], "unauthorized")
        self.assertEqual(room.members.count(), 1)

    def test_a_second_socket_does_not_replace_the_first(self):
        room = create_room("Ana")

        async_to_sync(self._two_sockets)(room.code, room.access_token)

        self.assertEqual(room.members.count(), 1)

    def test_reconnecting_after_the_game_starts_does_not_create_another(self):
        room = create_room("Ana")
        for name in ("Luis", "Nora", "Otto"):
            join_room(room.code, name)
        start_game(room.code, "Ana")

        event = async_to_sync(self._open_and_close)(room.code, room.access_token)

        room.refresh_from_db()
        self.assertEqual(event["payload"]["status"], Room.Status.STARTED)
        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(room.members.count(), MIN_ROOM_MEMBERS)
        self.assertEqual(room.game.participants.count(), MIN_ROOM_MEMBERS)

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        query = f"token={quote(token)}&name=Ana&player_id=1&group=room.OTHER"
        communicator.scope["query_string"] = query.encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = json.loads(await communicator.receive_from())
        return communicator, event

    async def _open_and_close(self, code, token):
        communicator, event = await self._open(code, token)
        self.assertEqual(event["type"], "room.snapshot")
        self.assertIn(room_group_name(code), get_channel_layer().groups)
        await communicator.disconnect()
        return event

    async def _reconnect(self, code, token):
        first_socket, first = await self._open(code, token)
        await first_socket.disconnect()
        _second_socket, second = await self._open(code, token)
        await _second_socket.disconnect()
        return first, second

    async def _fail(self, code, query):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = query.encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = json.loads(await communicator.receive_from())
        await communicator.disconnect()
        return event

    async def _reject_messages(self, code, token):
        communicator, _event = await self._open(code, token)
        await communicator.send_json_to({"type": "room.join", "payload": {}})
        rejected = json.loads(await communicator.receive_from())
        self.assertEqual(rejected["payload"]["code"], "unknown_type")
        await communicator.send_json_to({"type": "game.started", "payload": {}})
        rejected = json.loads(await communicator.receive_from())
        self.assertEqual(rejected["payload"]["code"], "server_only")
        await communicator.disconnect()

    async def _leave_while_connected(self, code, token):
        communicator, _event = await self._open(code, token)
        await database_sync_to_async(leave_room)(code, "Luis")
        left = json.loads(await communicator.receive_from())
        self.assertEqual(left["type"], "room.player_left")
        await communicator.send_json_to({"type": "room.ping", "payload": {}})
        event = json.loads(await communicator.receive_from())
        await communicator.disconnect()
        return event

    async def _two_sockets(self, code, token):
        first, _event = await self._open(code, token)
        second, _other = await self._open(code, token)
        group = get_channel_layer().groups[room_group_name(code)]
        self.assertEqual(len(group), 2)
        await first.disconnect()
        group = get_channel_layer().groups[room_group_name(code)]
        self.assertEqual(len(group), 1)
        await second.disconnect()
