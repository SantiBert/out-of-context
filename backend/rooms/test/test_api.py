import hashlib

from django.test import TestCase
from rest_framework.test import APIClient

from games.models import SituationCard
from rooms.models import MAX_ROOM_MEMBERS, Room
from rooms.service import create_room

PUBLIC_FIELDS = {
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
}


class RoomApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_creating_a_room_returns_its_public_state(self):
        card = SituationCard.objects.create(number=1, text="Una carta secreta")

        response = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), PUBLIC_FIELDS | {"token"})
        body = response.json()
        member = Room.objects.get(code=body["code"]).members.get()
        digest = hashlib.sha256(body["token"].encode()).hexdigest()
        self.assertEqual(member.token_hash, digest)
        self.assertNotEqual(body["token"], member.token_hash)
        self.assertEqual(body["host"], "Ana")
        self.assertEqual(body["participants"], ["Ana"])
        self.assertEqual(body["player_count"], 1)
        self.assertEqual(body["status"], Room.Status.WAITING)
        self.assertTrue(body["accepting_members"])
        self.assertFalse(body["can_start"])
        self.assertNotIn(card.text, response.content.decode())
        self.assertNotIn("pk", body)
        self.assertNotIn("role", body)
        self.assertNotIn("vote", body)

    def test_a_missing_or_blank_name_is_rejected(self):
        for payload in ({}, {"name": ""}, {"name": "   "}):
            with self.subTest(payload=payload):
                response = self.client.post("/api/rooms/", payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["code"], "invalid_room")
        self.assertEqual(Room.objects.count(), 0)

    def test_an_existing_room_can_be_read(self):
        room = create_room("Ana")

        response = self.client.get(f"/api/rooms/{room.code.lower()}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["code"], room.code)
        self.assertEqual(set(response.json()), PUBLIC_FIELDS)

    def test_an_unknown_room_is_not_found(self):
        response = self.client.get("/api/rooms/ZZZZZZ/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "room_not_found")

    def test_a_player_can_join(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]

        response = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Luis"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), PUBLIC_FIELDS | {"token"})
        self.assertNotEqual(response.json()["token"], created.json()["token"])
        self.assertEqual(response.json()["participants"], ["Ana", "Luis"])
        self.assertEqual(response.json()["player_count"], 2)
        fetched = self.client.get(f"/api/rooms/{code}/")
        self.assertEqual(set(fetched.json()), PUBLIC_FIELDS)
        self.assertNotIn("token", fetched.json())

    def test_a_duplicate_name_is_rejected(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]

        response = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": " Ana "},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "duplicate_member")

    def test_the_ninth_player_is_rejected(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]
        for index in range(MAX_ROOM_MEMBERS - 1):
            joined = self.client.post(
                f"/api/rooms/{code}/members/",
                {"name": f"Jugador {index}"},
                format="json",
            )
            self.assertEqual(joined.status_code, 201)

        response = self.client.post(
            f"/api/rooms/{code}/members/",
            {"name": "Extra"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "room_full")

    def test_a_room_that_is_not_waiting_rejects_a_join(self):
        room = create_room("Ana")
        Room.objects.filter(pk=room.pk).update(status="closed")

        response = self.client.post(
            f"/api/rooms/{room.code}/members/",
            {"name": "Luis"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "room_closed")
        self.assertEqual(room.members.count(), 1)

    def test_leave_is_not_published(self):
        room = create_room("Ana")

        response = self.client.post(
            f"/api/rooms/{room.code}/leave/",
            {"name": "Ana"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        room.refresh_from_db()
        self.assertEqual(room.status, Room.Status.WAITING)
        self.assertIsNone(room.game_id)

    def test_the_schema_lists_only_the_published_room_routes(self):
        response = self.client.get("/api/schema/")

        schema = response.content.decode()
        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/rooms/", schema)
        self.assertIn("/api/rooms/{code}/", schema)
        self.assertIn("/api/rooms/{code}/members/", schema)
        self.assertIn("/api/rooms/{code}/start/", schema)
        self.assertIn("/api/rooms/{code}/score/", schema)
        self.assertNotIn("/leave", schema)
