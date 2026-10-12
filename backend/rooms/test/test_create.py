from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from games.models import Game
from rooms.models import Room, RoomMember
from rooms.service import (
    INVITATION_ALPHABET,
    InvalidRoom,
    create_room,
)


class CreateRoomTests(TestCase):
    def test_a_room_starts_waiting_with_its_host(self):
        room = create_room("Ana")

        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertEqual(len(room.code), 6)
        self.assertTrue(set(room.code) <= set(INVITATION_ALPHABET))
        host = room.members.get()
        self.assertEqual(host.name, "Ana")
        self.assertTrue(host.is_host)
        self.assertEqual(Game.objects.count(), 0)

    def test_invitation_codes_are_unique(self):
        codes = iter(["AAAAAA", "AAAAAA", "BBBBBB"])
        with patch("rooms.service._invitation_code", side_effect=lambda: next(codes)):
            first = create_room("Ana")
            second = create_room("Luis")

        self.assertEqual(first.code, "AAAAAA")
        self.assertEqual(second.code, "BBBBBB")
        self.assertEqual(Room.objects.count(), 2)

    def test_the_same_name_can_host_another_room(self):
        create_room("Ana")
        create_room("Ana")

        self.assertEqual(RoomMember.objects.filter(name="Ana", is_host=True).count(), 2)

    def test_a_blank_name_does_not_create_a_room(self):
        with self.assertRaises(InvalidRoom):
            create_room("   ")

        self.assertEqual(Room.objects.count(), 0)
        self.assertEqual(RoomMember.objects.count(), 0)

    def test_a_name_longer_than_80_characters_is_rejected(self):
        with self.assertRaises(InvalidRoom):
            create_room("A" * 81)

        self.assertEqual(Room.objects.count(), 0)

    def test_a_repeated_name_in_the_same_room_is_rejected(self):
        room = create_room("Ana")

        with self.assertRaises(ValidationError):
            RoomMember.objects.create(room=room, name="Ana", is_host=False)

        self.assertEqual(room.members.count(), 1)

    def test_a_second_host_is_rejected(self):
        room = create_room("Ana")

        with self.assertRaises(ValidationError):
            RoomMember.objects.create(room=room, name="Luis", is_host=True)

        self.assertEqual(room.members.filter(is_host=True).count(), 1)
