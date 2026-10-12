import threading
from unittest.mock import patch

from django.db import connections
from django.test import TestCase, TransactionTestCase

from games.models import Game, Participant
from rooms.models import MAX_ROOM_MEMBERS, MIN_ROOM_MEMBERS, Room
from rooms.service import (
    InvalidPlayerCount,
    NotHost,
    RoomClosed,
    create_room,
    get_room_state,
    join_room,
    leave_room,
    start_game,
)


def fill_room(room, count):
    for index in range(count):
        join_room(room.code, f"Jugador {index}")


class StartGameTests(TestCase):
    def test_someone_other_than_the_host_cannot_start(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)

        with self.assertRaises(NotHost) as raised:
            start_game(room.code, "Jugador 0")

        self.assertEqual(raised.exception.code, "not_host")
        room.refresh_from_db()
        self.assertIsNone(room.game_id)
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertEqual(Game.objects.count(), 0)

    def test_three_members_cannot_start(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 2)

        with self.assertRaises(InvalidPlayerCount) as raised:
            start_game(room.code, "Ana")

        self.assertEqual(raised.exception.code, "invalid_player_count")
        room.refresh_from_db()
        self.assertIsNone(room.game_id)
        self.assertEqual(Game.objects.count(), 0)

    def test_four_members_start_one_preparing_game(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)

        game = start_game(room.code, " Ana ")

        room.refresh_from_db()
        self.assertEqual(game.status, Game.Status.PREPARING)
        self.assertEqual(room.game_id, game.pk)
        self.assertEqual(room.status, Room.Status.STARTED)
        self.assertEqual(
            list(game.participants.order_by("pk").values_list("name", flat=True)),
            ["Ana", "Jugador 0", "Jugador 1", "Jugador 2"],
        )
        self.assertEqual(game.piles.count(), 0)
        self.assertEqual(game.rounds.count(), 0)
        state = get_room_state(room.code)
        self.assertFalse(state.accepting_members)
        self.assertFalse(state.can_start)
        with self.assertRaises(RoomClosed):
            leave_room(room.code, "Jugador 0")
        self.assertEqual(room.members.count(), MIN_ROOM_MEMBERS)

    def test_eight_members_can_start(self):
        room = create_room("Ana")
        fill_room(room, MAX_ROOM_MEMBERS - 1)

        game = start_game(room.code, "Ana")

        self.assertEqual(game.participants.count(), MAX_ROOM_MEMBERS)
        self.assertEqual(game.piles.count(), 0)
        self.assertEqual(game.rounds.count(), 0)

    def test_a_room_that_is_not_waiting_cannot_start(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)
        Room.objects.filter(pk=room.pk).update(status="closed")

        with self.assertRaises(RoomClosed) as raised:
            start_game(room.code, "Ana")

        self.assertEqual(raised.exception.code, "room_closed")
        self.assertEqual(Game.objects.count(), 0)

    def test_the_host_receives_the_same_game_on_a_second_request(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)

        first = start_game(room.code, "Ana")
        second = start_game(room.code, "Ana")

        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(
            Participant.objects.filter(game=first).count(), MIN_ROOM_MEMBERS
        )

    def test_a_failure_while_creating_participants_rolls_back(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)
        original = Participant.objects.create
        calls = {"count": 0}

        def fail_on_second(**kwargs):
            calls["count"] += 1
            if calls["count"] == 2:
                raise RuntimeError("fallo parcial")
            return original(**kwargs)

        with self.assertRaises(RuntimeError):
            with patch(
                "rooms.service.Participant.objects.create",
                side_effect=fail_on_second,
            ):
                start_game(room.code, "Ana")

        room.refresh_from_db()
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertIsNone(room.game_id)
        self.assertEqual(Game.objects.count(), 0)
        self.assertEqual(Participant.objects.count(), 0)


class ConcurrentStartTests(TransactionTestCase):
    def test_two_starts_create_one_game(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)
        barrier = threading.Barrier(2)
        started = []
        errors = []

        def attempt():
            try:
                barrier.wait()
                started.append(start_game(room.code, "Ana").pk)
            except Exception as error:
                errors.append(error)
            finally:
                connections.close_all()

        connections.close_all()
        threads = [threading.Thread(target=attempt) for _index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(errors, [])
        self.assertEqual(set(started), {started[0]})
        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(
            Participant.objects.filter(game_id=started[0]).count(),
            MIN_ROOM_MEMBERS,
        )
