from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game, Participant, SituationCard
from realtime.consumers import room_group_name
from rooms.models import MAX_ROOM_MEMBERS, MIN_ROOM_MEMBERS, Room
from rooms.service import (
    DuplicateMember,
    HostCannotLeave,
    InvalidPlayerCount,
    NotHost,
    RoomFull,
    create_room,
    get_room_state,
    join_room,
    leave_room,
    start_game,
)

PUBLIC_FIELDS = {
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
}


def fill_room(room, count):
    for index in range(count):
        join_room(room.code, f"Jugador {index}")


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


class RoomPublishTests(TestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_creating_a_room_publishes_the_public_snapshot(self):
        card = SituationCard.objects.create(number=71, text="Una carta secreta")

        with self.captureOnCommitCallbacks(execute=True):
            room = create_room("Ana")
            channel = async_to_sync(_subscribe)(room.code)

        event = self._events(channel, 1)[0]
        self.assertEqual(event["type"], "room.snapshot")
        self.assertEqual(set(event["payload"]), PUBLIC_FIELDS)
        self.assertEqual(event["payload"]["host"], "Ana")
        self.assertEqual(event["payload"]["participants"], ["Ana"])
        self.assertEqual(event["payload"]["player_count"], 1)
        self.assertTrue(event["payload"]["accepting_members"])
        self.assertFalse(event["payload"]["can_start"])
        self.assertNotIn(card.text, str(event))
        self.assertNotIn("pk", event["payload"])

    def test_the_second_player_publishes_only_the_join(self):
        room = self._room()

        with self.captureOnCommitCallbacks(execute=True):
            join_room(room.code, "Luis")
            channel = async_to_sync(_subscribe)(room.code)

        event = self._events(channel, 1)[0]
        self.assertEqual(event["type"], "room.player_joined")
        self.assertEqual(event["payload"]["name"], "Luis")
        self.assertEqual(event["payload"]["participants"], ["Ana", "Luis"])
        self.assertFalse(event["payload"]["can_start"])

    def test_the_fourth_player_also_publishes_the_state_change(self):
        room = self._room()
        self._fill(room, 2)

        with self.captureOnCommitCallbacks(execute=True):
            join_room(room.code, "Jugador 2")
            channel = async_to_sync(_subscribe)(room.code)

        joined, changed = self._events(channel, 2)
        self.assertEqual(joined["type"], "room.player_joined")
        self.assertEqual(joined["payload"]["name"], "Jugador 2")
        self.assertEqual(changed["type"], "room.state_changed")
        self.assertTrue(changed["payload"]["can_start"])
        self.assertTrue(changed["payload"]["accepting_members"])
        self.assertEqual(changed["payload"]["player_count"], MIN_ROOM_MEMBERS)

    def test_the_eighth_player_publishes_that_the_room_is_full(self):
        room = self._room()
        self._fill(room, MAX_ROOM_MEMBERS - 2)

        with self.captureOnCommitCallbacks(execute=True):
            join_room(room.code, f"Jugador {MAX_ROOM_MEMBERS - 2}")
            channel = async_to_sync(_subscribe)(room.code)

        joined, changed = self._events(channel, 2)
        self.assertEqual(joined["type"], "room.player_joined")
        self.assertEqual(changed["type"], "room.state_changed")
        self.assertFalse(changed["payload"]["accepting_members"])
        self.assertTrue(changed["payload"]["can_start"])
        self.assertEqual(changed["payload"]["player_count"], MAX_ROOM_MEMBERS)

    def test_leaving_without_a_flag_change_publishes_only_the_departure(self):
        room = self._room()
        self._fill(room, 4)

        with self.captureOnCommitCallbacks(execute=True):
            leave_room(room.code, "Jugador 3")
            channel = async_to_sync(_subscribe)(room.code)

        event = self._events(channel, 1)[0]
        self.assertEqual(event["type"], "room.player_left")
        self.assertEqual(event["payload"]["name"], "Jugador 3")
        self.assertNotIn("Jugador 3", event["payload"]["participants"])
        self.assertTrue(event["payload"]["can_start"])

    def test_dropping_below_four_publishes_the_state_change(self):
        room = self._room()
        self._fill(room, 3)

        with self.captureOnCommitCallbacks(execute=True):
            leave_room(room.code, "Jugador 2")
            channel = async_to_sync(_subscribe)(room.code)

        left, changed = self._events(channel, 2)
        self.assertEqual(left["type"], "room.player_left")
        self.assertEqual(left["payload"]["name"], "Jugador 2")
        self.assertEqual(changed["type"], "room.state_changed")
        self.assertFalse(changed["payload"]["can_start"])
        self.assertEqual(changed["payload"]["player_count"], 3)

    def test_leaving_a_full_room_publishes_that_it_accepts_members(self):
        room = self._room()
        self._fill(room, MAX_ROOM_MEMBERS - 1)

        with self.captureOnCommitCallbacks(execute=True):
            leave_room(room.code, "Jugador 0")
            channel = async_to_sync(_subscribe)(room.code)

        left, changed = self._events(channel, 2)
        self.assertEqual(left["type"], "room.player_left")
        self.assertEqual(changed["type"], "room.state_changed")
        self.assertTrue(changed["payload"]["accepting_members"])
        self.assertEqual(changed["payload"]["player_count"], MAX_ROOM_MEMBERS - 1)

    def test_starting_publishes_the_game_and_the_new_state(self):
        room = self._room()
        self._fill(room, MIN_ROOM_MEMBERS - 1)

        with self.captureOnCommitCallbacks(execute=True):
            game = start_game(room.code, "Ana")
            channel = async_to_sync(_subscribe)(room.code)

        started, changed = self._events(channel, 2)
        self.assertEqual(started["type"], "game.started")
        self.assertEqual(set(started["payload"]), PUBLIC_FIELDS)
        self.assertEqual(started["payload"]["status"], Room.Status.STARTED)
        self.assertFalse(started["payload"]["accepting_members"])
        self.assertFalse(started["payload"]["can_start"])
        self.assertNotIn(game.pk, started["payload"].values())
        self.assertEqual(changed["type"], "room.state_changed")
        self.assertEqual(changed["payload"]["status"], Room.Status.STARTED)

    def test_a_repeated_start_publishes_nothing(self):
        room = self._room()
        self._fill(room, MIN_ROOM_MEMBERS - 1)
        with self.captureOnCommitCallbacks(execute=True):
            game = start_game(room.code, "Ana")

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            again = start_game(room.code, "Ana")

        self.assertEqual(callbacks, [])
        self.assertEqual(game.pk, again.pk)

    def test_another_room_does_not_receive_the_event(self):
        first = self._room()
        second = self._room("Luis")
        first_channel = async_to_sync(_subscribe)(first.code)
        second_channel = async_to_sync(_subscribe)(second.code)

        with self.captureOnCommitCallbacks(execute=True):
            join_room(first.code, "Bea")

        event = self._events(first_channel, 1)[0]
        self.assertEqual(event["payload"]["code"], first.code)
        self.assertNotIn(second_channel, get_channel_layer().channels)

    def test_a_rejected_operation_publishes_nothing(self):
        room = self._room()
        self._assert_no_event(DuplicateMember, join_room, room.code, "Ana")
        self._assert_no_event(HostCannotLeave, leave_room, room.code, "Ana")
        self._fill(room, MAX_ROOM_MEMBERS - 1)
        self._assert_no_event(RoomFull, join_room, room.code, "Extra")
        self._assert_no_event(NotHost, start_game, room.code, "Jugador 0")
        small = self._room("Host")
        self._fill(small, 2)
        self._assert_no_event(InvalidPlayerCount, start_game, small.code, "Host")

    def test_a_partial_start_failure_publishes_nothing(self):
        room = self._room()
        self._fill(room, MIN_ROOM_MEMBERS - 1)
        original = Participant.objects.create
        calls = {"count": 0}

        def fail_on_second(**kwargs):
            calls["count"] += 1
            if calls["count"] == 2:
                raise RuntimeError("fallo parcial")
            return original(**kwargs)

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(RuntimeError):
                with patch(
                    "rooms.service.Participant.objects.create",
                    side_effect=fail_on_second,
                ):
                    start_game(room.code, "Ana")

        self.assertEqual(callbacks, [])
        room.refresh_from_db()
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertIsNone(room.game_id)
        self.assertEqual(Game.objects.count(), 0)

    def test_changes_without_subscribers_stay_in_the_database(self):
        with self.assertNoLogs("realtime.publish", level="ERROR"):
            room = self._room()
            self._commit(lambda: join_room(room.code, "Luis"))
            self._commit(lambda: leave_room(room.code, "Luis"))
            self._fill(room, MIN_ROOM_MEMBERS - 1)
            game = self._commit(lambda: start_game(room.code, "Ana"))

        self.assertNotIn(room_group_name(room.code), get_channel_layer().groups)
        room.refresh_from_db()
        state = get_room_state(room.code)
        self.assertEqual(room.game_id, game.pk)
        self.assertEqual(state.status, Room.Status.STARTED)
        self.assertEqual(state.player_count, MIN_ROOM_MEMBERS)
        self.assertNotIn("Luis", state.participants)

    def test_a_publish_failure_keeps_the_created_room(self):
        client = APIClient()

        class BrokenLayer:
            async def group_send(self, group, message):
                raise ConnectionError("redis no disponible")

        with self.assertLogs("realtime.publish", level="ERROR"):
            with patch(
                "realtime.publish.get_channel_layer",
                return_value=BrokenLayer(),
            ):
                with self.captureOnCommitCallbacks(execute=True):
                    created = client.post(
                        "/api/rooms/",
                        {"name": "Ana"},
                        format="json",
                    )

        self.assertEqual(created.status_code, 201)
        fetched = client.get(f"/api/rooms/{created.json()['code']}/")
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["host"], "Ana")
        self.assertEqual(fetched.json()["participants"], ["Ana"])

    def _room(self, name="Ana"):
        with self.captureOnCommitCallbacks(execute=True):
            return create_room(name)

    def _fill(self, room, count):
        with self.captureOnCommitCallbacks(execute=True):
            fill_room(room, count)

    def _events(self, channel, count):
        messages = [async_to_sync(_receive)(channel) for _index in range(count)]
        self.assertNotIn(channel, get_channel_layer().channels)
        return [message["message"] for message in messages]

    def _commit(self, operation):
        with self.captureOnCommitCallbacks(execute=True):
            return operation()

    def _assert_no_event(self, error, operation, code, name):
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(error):
                operation(code, name)
        self.assertEqual(callbacks, [])
