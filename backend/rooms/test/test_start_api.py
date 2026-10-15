from urllib.parse import quote

from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game
from rooms.models import Room
from rooms.service import create_room


def _join(client, code, name):
    response = client.post(
        f"/api/rooms/{code}/members/",
        {"name": name},
        format="json",
    )
    return response


class StartRoomApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _ready_room(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]
        host_token = created.json()["token"]
        tokens = {"Ana": host_token}
        for name in ("Luis", "Nora", "Otto"):
            joined = _join(self.client, code, name)
            self.assertEqual(joined.status_code, 201)
            tokens[name] = joined.json()["token"]
        return code, tokens

    def test_the_host_token_starts_the_room_once(self):
        code, tokens = self._ready_room()

        started = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(tokens['Ana'])}"
        )
        again = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(tokens['Ana'])}"
        )

        self.assertEqual(started.status_code, 200)
        body = started.json()
        self.assertEqual(
            set(body),
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
        self.assertEqual(body["status"], Room.Status.STARTED)
        self.assertEqual(body["host"], "Ana")
        self.assertEqual(body["player_count"], 4)
        self.assertNotIn("token", body)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["status"], Room.Status.STARTED)
        self.assertEqual(Game.objects.count(), 1)

    def test_another_member_cannot_start(self):
        code, tokens = self._ready_room()

        response = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(tokens['Luis'])}"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "not_host")
        self.assertEqual(
            response.json()["detail"], "Solo el anfitrión puede iniciar la partida."
        )
        room = Room.objects.get(code=code)
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertIsNone(room.game_id)

    def test_a_missing_token_is_unauthorized(self):
        code, _tokens = self._ready_room()
        stranger = create_room("Otra")

        missing = self.client.post(f"/api/rooms/{code}/start/")
        foreign = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(stranger.access_token)}"
        )

        self.assertEqual(missing.status_code, 401)
        self.assertEqual(missing.json()["code"], "unauthorized")
        self.assertEqual(foreign.status_code, 401)
        self.assertEqual(foreign.json()["code"], "unauthorized")
        self.assertEqual(Game.objects.count(), 0)

    def test_fewer_than_four_players_cannot_start(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]

        response = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(created.json()['token'])}"
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "invalid_player_count")
        self.assertIsNone(Room.objects.get(code=code).game_id)

    def test_an_unknown_room_is_not_found(self):
        response = self.client.post("/api/rooms/ZZZZZZ/start/?token=algo")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "room_not_found")
