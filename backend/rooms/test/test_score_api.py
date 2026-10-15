from urllib.parse import quote

from django.test import TestCase
from rest_framework.test import APIClient

from games.models import Game, Round, ScoreAward
from rooms.service import create_room


def _join(client, code, name):
    return client.post(
        f"/api/rooms/{code}/members/",
        {"name": name},
        format="json",
    )


class ScoreboardApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _started(self):
        created = self.client.post("/api/rooms/", {"name": "Ana"}, format="json")
        code = created.json()["code"]
        tokens = {"Ana": created.json()["token"]}
        for name in ("Luis", "Nora", "Otto"):
            joined = _join(self.client, code, name)
            self.assertEqual(joined.status_code, 201)
            tokens[name] = joined.json()["token"]
        started = self.client.post(
            f"/api/rooms/{code}/start/?token={quote(tokens['Ana'])}"
        )
        self.assertEqual(started.status_code, 200)
        return code, tokens

    def _award(self, code, points):
        game = Game.objects.get(room__code=code)
        round_ = Round.objects.create(
            game=game,
            number=1,
            status=Round.Status.FINISHED,
        )
        for name, total in points.items():
            ScoreAward.objects.create(
                round=round_,
                participant=game.participants.get(name=name),
                points=total,
            )
        return game

    def test_totals_follow_signup_order_without_winners(self):
        code, tokens = self._started()
        self._award(code, {"Ana": 3, "Luis": 1, "Nora": 3, "Otto": 0})

        first = self.client.get(
            f"/api/rooms/{code}/score/?token={quote(tokens['Ana'])}"
        )
        again = self.client.get(
            f"/api/rooms/{code}/score/?token={quote(tokens['Ana'])}"
        )

        self.assertEqual(first.status_code, 200)
        body = first.json()
        self.assertEqual(set(body), {"status", "standings"})
        self.assertEqual(body["status"], Game.Status.PREPARING)
        self.assertEqual(
            body["standings"],
            [
                {"name": "Ana", "points": 3},
                {"name": "Luis", "points": 1},
                {"name": "Nora", "points": 3},
                {"name": "Otto", "points": 0},
            ],
        )
        self.assertNotIn("winners", body)
        self.assertEqual(again.json(), body)
        self.assertEqual(
            Game.objects.get(room__code=code).status, Game.Status.PREPARING
        )

    def test_a_finished_tie_names_every_leader(self):
        code, tokens = self._started()
        game = self._award(code, {"Ana": 3, "Luis": 1, "Nora": 3, "Otto": 0})
        game.status = Game.Status.FINISHED
        game.save()

        response = self.client.get(
            f"/api/rooms/{code}/score/?token={quote(tokens['Luis'])}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], Game.Status.FINISHED)
        self.assertEqual(response.json()["winners"], ["Ana", "Nora"])

    def test_a_stranger_and_a_room_without_a_game_are_rejected(self):
        code, _tokens = self._started()
        stranger = create_room("Zoe")

        denied = self.client.get(
            f"/api/rooms/{code}/score/?token={quote(stranger.access_token)}"
        )
        waiting = self.client.post("/api/rooms/", {"name": "Ines"}, format="json")
        missing = self.client.get(
            f"/api/rooms/{waiting.json()['code']}/score/"
            f"?token={quote(waiting.json()['token'])}"
        )
        unknown = self.client.get("/api/rooms/ZZZZZZ/score/?token=algo")

        self.assertEqual(denied.status_code, 401)
        self.assertEqual(denied.json()["code"], "unauthorized")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json()["code"], "round_unavailable")
        self.assertEqual(unknown.status_code, 404)
        self.assertEqual(unknown.json()["code"], "room_not_found")
