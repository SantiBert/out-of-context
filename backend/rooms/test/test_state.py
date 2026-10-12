from django.test import TestCase

from games.models import SituationCard
from rooms.models import MAX_ROOM_MEMBERS, MIN_ROOM_MEMBERS, Room
from rooms.service import RoomNotFound, create_room, get_room_state, join_room
from rooms.state import RoomState

PUBLIC_FIELDS = (
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
)


def fill_room(room, count):
    for index in range(count):
        join_room(room.code, f"Jugador {index}")


class RoomStateTests(TestCase):
    def test_a_new_room_is_open_and_cannot_start(self):
        room = create_room("Ana")

        state = get_room_state(room.code)

        self.assertEqual(state.code, room.code)
        self.assertEqual(state.status, Room.Status.WAITING)
        self.assertEqual(state.host, "Ana")
        self.assertEqual(state.participants, ("Ana",))
        self.assertEqual(state.player_count, 1)
        self.assertTrue(state.accepting_members)
        self.assertFalse(state.can_start)

    def test_the_code_match_ignores_case_and_surrounding_spaces(self):
        room = create_room("Ana")
        join_room(room.code, "Luis")

        state = get_room_state(f"  {room.code.lower()}  ")

        self.assertEqual(state.code, room.code)
        self.assertEqual(state.participants, ("Ana", "Luis"))
        self.assertEqual(state.player_count, 2)

    def test_an_unknown_code_is_rejected(self):
        for code in ("ZZZZZZ", "   ", None):
            with self.subTest(code=code):
                with self.assertRaises(RoomNotFound) as raised:
                    get_room_state(code)
                self.assertEqual(raised.exception.code, "room_not_found")

    def test_three_members_cannot_start(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 2)

        state = get_room_state(room.code)

        self.assertEqual(state.player_count, 3)
        self.assertTrue(state.accepting_members)
        self.assertFalse(state.can_start)

    def test_four_members_can_start(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)

        state = get_room_state(room.code)

        self.assertEqual(state.player_count, MIN_ROOM_MEMBERS)
        self.assertTrue(state.accepting_members)
        self.assertTrue(state.can_start)
        self.assertEqual(state.host, "Ana")

    def test_a_full_room_can_start_and_rejects_new_members(self):
        room = create_room("Ana")
        fill_room(room, MAX_ROOM_MEMBERS - 1)

        state = get_room_state(room.code)

        self.assertEqual(state.player_count, MAX_ROOM_MEMBERS)
        self.assertFalse(state.accepting_members)
        self.assertTrue(state.can_start)

    def test_a_room_that_is_not_waiting_is_closed(self):
        room = create_room("Ana")
        fill_room(room, MIN_ROOM_MEMBERS - 1)
        Room.objects.filter(pk=room.pk).update(status="closed")

        state = get_room_state(room.code)

        self.assertEqual(state.status, "closed")
        self.assertEqual(state.player_count, MIN_ROOM_MEMBERS)
        self.assertFalse(state.accepting_members)
        self.assertFalse(state.can_start)

    def test_the_public_state_omits_private_data(self):
        room = create_room("Ana")
        card = SituationCard.objects.create(number=1, text="Una carta secreta")

        state = get_room_state(room.code)

        self.assertIsInstance(state, RoomState)
        self.assertEqual(state._fields, PUBLIC_FIELDS)
        self.assertNotIn(card.text, state._asdict().values())
        for hidden in ("pk", "card", "role", "vote"):
            self.assertNotIn(hidden, state._fields)
