import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from config.asgi import application
from realtime.consumers import room_group_name
from rooms.service import create_room


class RoomSocketTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_a_known_room_rejects_the_host_name_and_a_player_id(self):
        room = create_room("Ana")
        query = f"name={room.members.get().name}&player_id=9&group=room.OTHER"
        event = async_to_sync(self._connect)(room.code, query)

        self.assertEqual(event["type"], "connection.error")
        self.assertEqual(set(event["payload"]), {"code", "detail"})
        self.assertEqual(event["payload"]["code"], "unauthorized")
        self.assertNotIn("Ana", event["payload"]["detail"])
        self.assertNotIn("9", event["payload"]["detail"])
        self._assert_no_subscriptions(room.code)

    def test_an_unknown_room_does_not_reveal_members(self):
        create_room("Ana")
        event = async_to_sync(self._connect)("ZZZZZZ", "player_id=1")

        self.assertEqual(event["payload"]["code"], "room_not_found")
        self.assertEqual(set(event["payload"]), {"code", "detail"})
        self.assertNotIn("Ana", json.dumps(event))
        self._assert_no_subscriptions("ZZZZZZ")

    def test_two_rooms_do_not_share_a_group(self):
        first = create_room("Ana")
        second = create_room("Luis")

        async_to_sync(self._connect)(first.code, "group=room." + second.code)
        async_to_sync(self._connect)(second.code, "player_id=4")

        layer = get_channel_layer()
        self.assertEqual(layer.groups, {})
        self.assertNotEqual(room_group_name(first.code), room_group_name(second.code))

    def test_the_group_name_comes_only_from_the_room_code(self):
        self.assertEqual(room_group_name("  ab12cd  "), "room.AB12CD")

    async def _connect(self, code, query):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = query.encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = json.loads(await communicator.receive_from())
        await communicator.disconnect()
        return event

    def _assert_no_subscriptions(self, code):
        layer = get_channel_layer()
        self.assertNotIn(room_group_name(code), layer.groups)
        self.assertNotIn("room.OTHER", layer.groups)
        self.assertEqual(layer.groups, {})
