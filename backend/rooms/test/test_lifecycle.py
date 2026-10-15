from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game, Participant, SituationCard
from rooms.models import MAX_ROOM_MEMBERS, Room
from rooms.service import (
    HostCannotLeave,
    InvalidPlayerCount,
    NotHost,
    RoomClosed,
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


class RoomLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_a_room_can_be_filled_left_and_started_once(self):
        card = SituationCard.objects.create(number=41, text="Una carta secreta")
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        self.assertEqual(created.status_code, 201)
        code = created.json()["code"]

        state = self.client.get(f"/api/rooms/{code}/").json()
        self.assertEqual(state["status"], Room.Status.WAITING)
        self.assertEqual(state["player_count"], 1)
        self.assertTrue(state["accepting_members"])
        self.assertFalse(state["can_start"])

        for name in ("Luis", "Nora"):
            joined = self.client.post(
                f"/api/rooms/{code}/members/",
                {"name": name},
                format="json",
            )
            self.assertEqual(joined.status_code, 201)

        with self.assertRaises(InvalidPlayerCount):
            start_game(code, "Ana")
        self.assertEqual(Game.objects.count(), 0)

        fourth = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Otto"},
            format="json",
        )
        self.assertEqual(fourth.status_code, 201)
        self.assertTrue(self.client.get(f"/api/rooms/{code}/").json()["can_start"])

        with self.assertRaises(HostCannotLeave):
            leave_room(code, "Ana")
        still_there = self.client.get(f"/api/rooms/{code}/").json()
        self.assertEqual(still_there["player_count"], 4)

        leave_room(code, "Otto")
        after_leave = self.client.get(f"/api/rooms/{code}/").json()
        self.assertEqual(after_leave["player_count"], 3)
        self.assertEqual(after_leave["participants"].count("Otto"), 0)
        self.assertTrue(after_leave["accepting_members"])
        self.assertFalse(after_leave["can_start"])

        returned = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Otto"},
            format="json",
        )
        self.assertEqual(returned.status_code, 201)
        self.assertEqual(returned.json()["participants"].count("Otto"), 1)

        response = self.client.post(
            f"/api/rooms/{code}/leave/",
            {"name": "Ana"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        room = Room.objects.get(code=code)
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertIsNone(room.game_id)

        with self.assertRaises(NotHost):
            start_game(code, "Luis")
        self.assertEqual(Game.objects.count(), 0)

        game = start_game(code, "Ana")
        repeated = start_game(code, "Ana")
        self.assertEqual(game.pk, repeated.pk)
        self.assertEqual(game.status, Game.Status.PREPARING)
        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(
            list(game.participants.order_by("pk").values_list("name", flat=True)),
            ["Ana", "Luis", "Nora", "Otto"],
        )
        self.assertEqual(Participant.objects.filter(game=game).count(), 4)
        self.assertEqual(game.piles.count(), 0)
        self.assertEqual(game.rounds.count(), 0)

        started = self.client.get(f"/api/rooms/{code}/")
        body = started.json()
        self.assertEqual(set(body), PUBLIC_FIELDS)
        self.assertEqual(body["status"], Room.Status.STARTED)
        self.assertFalse(body["accepting_members"])
        self.assertFalse(body["can_start"])
        self.assertNotIn(card.text, started.content.decode())
        self.assertNotIn(str(game.pk), started.content.decode())

        closed_join = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Vera"},
            format="json",
        )
        self.assertEqual(closed_join.status_code, 409)
        self.assertEqual(closed_join.json()["code"], "room_closed")
        with self.assertRaises(RoomClosed):
            leave_room(code, "Luis")
        self.assertEqual(room.members.count(), 4)
        self.assertEqual(Game.objects.count(), 1)

    def test_eight_players_can_start_and_the_ninth_cannot_join(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]
        for index in range(MAX_ROOM_MEMBERS - 1):
            joined = self.client.post(
                f"/api/rooms/{code}/members/",
                {"name": f"Jugador {index}"},
                format="json",
            )
            self.assertEqual(joined.status_code, 201)

        rejected = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Extra"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 409)
        self.assertEqual(rejected.json()["code"], "room_full")

        game = start_game(code, "Ana")
        self.assertEqual(game.participants.count(), MAX_ROOM_MEMBERS)
        self.assertEqual(Game.objects.count(), 1)
        self.assertEqual(start_game(code, "Ana").pk, game.pk)
