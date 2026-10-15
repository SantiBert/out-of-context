import random
import threading
from datetime import timedelta
from urllib.parse import quote

from django.db import connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from games.deck import start_round
from games.models import ScoreAward
from games.scoring import close_vote
from rooms.service import (
    begin_conversation,
    call_basta,
    cast_vote,
    create_room,
    get_room_state,
    raise_hand,
    round_state,
)
from rooms.test.test_hand import playing_room


def open_voting(seed=1):
    room, tokens, game = playing_room()
    start_round(game, random.Random(seed))
    begin_conversation(room.code, tokens["Ana"])
    for name in ("Ana", "Luis", "Nora"):
        raise_hand(room.code, tokens[name])
    call_basta(room.code, tokens["Otto"])
    round_ = game.rounds.get()
    round_.vote_closes_at = timezone.now() + timedelta(minutes=5)
    round_.save(update_fields=["vote_closes_at"])
    return room, tokens, game


class CastVoteTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_a_player_registers_one_choice_and_can_repeat_it(self):
        room, tokens, game = open_voting()

        first = self._post(
            room.code,
            tokens["Ana"],
            {"gesture": "point", "targets": ["Luis"]},
        )
        second = self._post(
            room.code,
            tokens["Ana"],
            {"gesture": "point", "targets": ["Luis"]},
        )
        otto = self._post(room.code, tokens["Otto"], {"gesture": "fist", "targets": []})
        nora = self._post(
            room.code,
            tokens["Nora"],
            {"gesture": "point", "targets": ["Ana", "Luis"]},
        )
        public = round_state(room.code, tokens["Luis"])
        room_body = get_room_state(room.code)._asdict()

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json(), {"gesture": "point", "targets": ["Luis"]})
        self.assertEqual(second.json(), first.json())
        self.assertEqual(otto.json(), {"gesture": "fist", "targets": []})
        self.assertEqual(nora.json(), {"gesture": "point", "targets": ["Ana", "Luis"]})
        self.assertEqual(game.rounds.get().votes.count(), 3)
        self.assertEqual(ScoreAward.objects.filter(round=game.rounds.get()).count(), 0)
        self.assertNotIn("gesture", public)
        self.assertNotIn("targets", public)
        self.assertNotIn("gesture", room_body)

    def test_a_different_choice_is_rejected(self):
        room, tokens, game = open_voting(2)
        self._post(room.code, tokens["Ana"], {"gesture": "point", "targets": ["Luis"]})

        changed = self._post(
            room.code,
            tokens["Ana"],
            {"gesture": "fist", "targets": []},
        )

        self.assertEqual(changed.status_code, 409)
        self.assertEqual(changed.json()["code"], "invalid_vote")
        self.assertEqual(game.rounds.get().votes.get().gesture, "point")
        self.assertEqual(ScoreAward.objects.count(), 0)

    def test_invalid_targets_and_a_closed_or_early_round_do_not_vote(self):
        room, tokens, game = open_voting(3)
        participant_id = str(game.participants.get(name="Ana").pk)
        stranger = create_room("Sara")

        for body in (
            {"gesture": "point", "targets": ["Ana"]},
            {"gesture": "point", "targets": ["Luis", "Luis"]},
            {"gesture": "point", "targets": ["Zoe"]},
            {"gesture": "fist", "targets": ["Luis"]},
            {"gesture": "point", "targets": ["Luis"], "role": "impostor"},
            {"gesture": "point", "targets": ["Luis"], "points": 3},
            {"gesture": "wave", "targets": []},
        ):
            response = self._post(room.code, tokens["Ana"], body)
            self.assertIn(response.status_code, (400, 409), body)
            self.assertEqual(response.json()["code"], "invalid_vote")
        self.assertEqual(game.rounds.get().votes.count(), 0)

        for token in ("", participant_id, stranger.access_token):
            response = self._post(
                room.code,
                token,
                {"gesture": "point", "targets": ["Luis"]},
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["code"], "unauthorized")
        self.assertEqual(game.rounds.get().votes.count(), 0)

        closed = game.rounds.get()
        closed.vote_closes_at = timezone.now() - timedelta(seconds=1)
        closed.save(update_fields=["vote_closes_at"])
        late = self._post(
            room.code,
            tokens["Ana"],
            {"gesture": "point", "targets": ["Luis"]},
        )
        self.assertEqual(late.status_code, 409)
        self.assertEqual(late.json()["code"], "invalid_round")
        self.assertEqual(game.rounds.get().votes.count(), 0)

    def test_a_choice_during_conversation_is_rejected(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(4))
        begin_conversation(room.code, tokens["Ana"])

        early = self._post(room.code, tokens["Ana"], {"gesture": "fist", "targets": []})

        self.assertEqual(early.status_code, 409)
        self.assertEqual(early.json()["code"], "invalid_round")
        self.assertEqual(game.rounds.get().votes.count(), 0)

    def test_results_stay_unavailable_until_they_are_stored(self):
        room, tokens, game = open_voting(6)
        stranger = create_room("Sara")

        hidden = self.client.get(
            f"/api/rooms/{room.code}/results/",
            {"token": tokens["Ana"]},
        )
        foreign = self.client.get(
            f"/api/rooms/{room.code}/results/",
            {"token": stranger.access_token},
        )

        self.assertEqual(hidden.status_code, 409)
        self.assertEqual(set(hidden.json()), {"code", "detail"})
        self.assertEqual(hidden.json()["code"], "results_unavailable")
        self.assertEqual(foreign.status_code, 401)
        self.assertEqual(foreign.json()["code"], "unauthorized")
        self.assertEqual(ScoreAward.objects.count(), 0)

        round_ = game.rounds.get()
        groups = {}
        hands = round_.dealt_hands.select_related("participant", "card_copy")
        for hand in hands:
            groups.setdefault(hand.card_copy.card_id, []).append(hand.participant)
        for group in groups.values():
            if len(group) == 1:
                cast_vote(room.code, tokens[group[0].name], "fist", [])
                continue
            for player in group:
                targets = [other.name for other in group if other != player]
                cast_vote(room.code, tokens[player.name], "point", targets)
        round_.vote_closes_at = timezone.now() - timedelta(seconds=1)
        round_.save(update_fields=["vote_closes_at"])
        close_vote(round_, round_.vote_closes_at)
        awards = ScoreAward.objects.filter(round=round_).count()

        revealed = self.client.get(
            f"/api/rooms/{room.code}/results/",
            {"token": tokens["Ana"]},
        )

        self.assertEqual(revealed.status_code, 200)
        self.assertEqual(len(revealed.json()), 4)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), awards)
        self.assertNotIn("pk", str(revealed.json()))

    def _post(self, code, token, body):
        return self.client.post(
            f"/api/rooms/{code}/vote/?token={quote(token)}",
            body,
            format="json",
        )


class ConcurrentVoteTests(TransactionTestCase):
    def test_two_identical_choices_leave_one_vote(self):
        room, tokens, game = open_voting(5)
        barrier = threading.Barrier(2)
        errors = []

        def attempt():
            try:
                barrier.wait()
                cast_vote(room.code, tokens["Ana"], "point", ["Luis"])
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

        round_ = game.rounds.get()
        self.assertEqual(errors, [])
        self.assertEqual(round_.votes.count(), 1)
        self.assertEqual(round_.votes.get().targets.count(), 1)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 0)
