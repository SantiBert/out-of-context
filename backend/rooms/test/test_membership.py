import threading

from django.db import connections
from django.test import TestCase, TransactionTestCase

from rooms.models import MAX_ROOM_MEMBERS, Room, RoomMember
from rooms.service import (
    DuplicateMember,
    HostCannotLeave,
    MemberNotFound,
    RoomClosed,
    RoomFull,
    RoomNotFound,
    create_room,
    join_room,
    leave_room,
)


def fill_room(room, count):
    for index in range(count):
        join_room(room.code, f"Jugador {index}")


class JoinRoomTests(TestCase):
    def test_a_player_joins_a_waiting_room(self):
        room = create_room("Ana")

        member = join_room(f"  {room.code.lower()}  ", "Luis")

        self.assertEqual(member.name, "Luis")
        self.assertFalse(member.is_host)
        self.assertEqual(room.members.count(), 2)
        room.refresh_from_db()
        self.assertEqual(room.status, Room.Status.WAITING)

    def test_an_unknown_code_is_rejected(self):
        with self.assertRaises(RoomNotFound) as raised:
            join_room("ZZZZZZ", "Luis")

        self.assertEqual(raised.exception.code, "room_not_found")

    def test_a_room_that_is_not_waiting_is_closed(self):
        room = create_room("Ana")
        Room.objects.filter(pk=room.pk).update(status="closed")

        with self.assertRaises(RoomClosed) as raised:
            join_room(room.code, "Luis")

        self.assertEqual(raised.exception.code, "room_closed")
        self.assertEqual(room.members.count(), 1)

    def test_the_ninth_player_is_rejected(self):
        room = create_room("Ana")
        fill_room(room, MAX_ROOM_MEMBERS - 1)

        with self.assertRaises(RoomFull) as raised:
            join_room(room.code, "Extra")

        self.assertEqual(raised.exception.code, "room_full")
        self.assertEqual(room.members.count(), MAX_ROOM_MEMBERS)

    def test_a_duplicate_name_is_rejected(self):
        room = create_room("Ana")
        join_room(room.code, "Luis")

        with self.assertRaises(DuplicateMember) as raised:
            join_room(room.code, " Luis ")

        self.assertEqual(raised.exception.code, "duplicate_member")
        self.assertEqual(room.members.filter(name="Luis").count(), 1)


class LeaveRoomTests(TestCase):
    def test_a_participant_can_leave(self):
        room = create_room("Ana")
        join_room(room.code, "Luis")

        leave_room(room.code.lower(), "Luis")

        room.refresh_from_db()
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertEqual(list(room.members.values_list("name", flat=True)), ["Ana"])
        self.assertTrue(room.members.get().is_host)

    def test_the_host_cannot_leave(self):
        room = create_room("Ana")

        with self.assertRaises(HostCannotLeave) as raised:
            leave_room(room.code, "Ana")

        self.assertEqual(raised.exception.code, "host_cannot_leave")
        self.assertEqual(room.members.count(), 1)

    def test_an_absent_name_is_rejected(self):
        room = create_room("Ana")

        with self.assertRaises(MemberNotFound) as raised:
            leave_room(room.code, "Luis")

        self.assertEqual(raised.exception.code, "member_not_found")


class ConcurrentJoinTests(TransactionTestCase):
    def test_two_joins_at_seven_members_admit_only_one(self):
        room = create_room("Ana")
        fill_room(room, MAX_ROOM_MEMBERS - 2)
        barrier = threading.Barrier(2)
        errors = []

        def attempt(name):
            try:
                barrier.wait()
                join_room(room.code, name)
            except RoomFull as error:
                errors.append(error)
            finally:
                connections.close_all()

        connections.close_all()
        threads = [
            threading.Thread(target=attempt, args=("Luis",)),
            threading.Thread(target=attempt, args=("Nora",)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(RoomMember.objects.filter(room=room).count(), MAX_ROOM_MEMBERS)
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].code, "room_full")
