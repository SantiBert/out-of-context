import json
import random
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from config.asgi import application
from games.deck import start_round
from games.models import Game, Round, ScoreAward
from games.scoring import total_points
from realtime.consumers import room_group_name
from rooms.service import (
    begin_conversation,
    call_basta,
    create_room,
    publish_due,
    raise_hand,
)
from rooms.test.test_hand import playing_room


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


def _groups(round_):
    grouped = {}
    hands = round_.dealt_hands.select_related("participant", "card_copy")
    for hand in hands:
        grouped.setdefault(hand.card_copy.card_id, []).append(hand.participant)
    return [sorted(group, key=lambda player: player.name) for group in grouped.values()]


def _finished(round_id):
    stored = Round.objects.select_related("game").get(pk=round_id)
    return stored.status, stored.game.rounds.count(), stored.game.status


def _choices(round_id):
    stored = Round.objects.get(pk=round_id)
    votes = list(
        stored.votes.order_by("participant__name").values_list(
            "participant__name",
            "gesture",
        )
    )
    return stored.status, votes


class VoteCycleTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_a_trio_reveals_the_round_once(self):
        async_to_sync(self._trio)()

    def test_a_pair_scores_zero_and_several_pointers(self):
        async_to_sync(self._pair)()

    def test_one_pointer_and_a_partial_choice_score_on_close(self):
        async_to_sync(self._one_pointer)()

    def test_a_missing_choice_does_not_reveal(self):
        async_to_sync(self._missing)()

    def test_a_failed_award_does_not_publish_the_reveal(self):
        async_to_sync(self._failed_award)()

    async def _trio(self):
        room, tokens, game, round_, countdown, secret = await self._prepare(2)
        groups = await database_sync_to_async(_groups)(round_)
        self.assertEqual(sorted(len(group) for group in groups), [1, 3])
        team = next(group for group in groups if len(group) == 3)
        impostor = next(group[0] for group in groups if len(group) == 1)
        votes = [
            (
                player.name,
                "point",
                [other.name for other in team if other != player],
            )
            for player in team
        ]
        votes.append((impostor.name, "fist", []))
        await self._post_all(room.code, tokens, votes)
        repeated = await self._post(
            room.code,
            tokens[team[0].name],
            "point",
            [other.name for other in team if other != team[0]],
        )
        self.assertEqual(repeated.status_code, 200)
        await self._assert_hidden(room.code, tokens["Ana"], secret, countdown)
        stranger = await database_sync_to_async(create_room)("Sara")
        foreign = await self._results(room.code, stranger.access_token)
        self.assertEqual(foreign.status_code, 401)

        revealed = await self._close(room.code, round_)
        by_name = {row["name"]: row for row in revealed}
        for player in team:
            self.assertEqual(by_name[player.name]["points"], 2)
            self.assertEqual(by_name[player.name]["gesture"], "point")
        self.assertEqual(by_name[impostor.name]["points"], 1)
        self.assertEqual(by_name[impostor.name]["gesture"], "fist")
        self.assertIn(secret, [row["card"]["text"] for row in revealed])
        await self._assert_totals(game, round_, revealed)

        again = await database_sync_to_async(publish_due)(
            room.code,
            round_.pk,
            round_.vote_closes_at,
        )
        self.assertEqual(again, [])
        reread = await self._results(room.code, tokens["Ana"])
        self.assertEqual(reread.status_code, 200)
        self.assertEqual(reread.json(), revealed)
        awards = await database_sync_to_async(
            lambda: ScoreAward.objects.filter(round=round_).count()
        )()
        self.assertEqual(awards, 4)
        status, rounds, game_status = await database_sync_to_async(_finished)(round_.pk)
        self.assertEqual(status, Round.Status.FINISHED)
        self.assertEqual(rounds, 1)
        self.assertEqual(game_status, Game.Status.PREPARING)

        communicator, snapshot = await self._open(room.code, tokens["Luis"])
        try:
            self.assertEqual(snapshot["type"], "room.snapshot")
            self._silent(communicator)
        finally:
            await communicator.disconnect()
        public = await self._json(f"/api/rooms/{room.code}/round/", tokens["Luis"])
        self.assertEqual(public["results"], revealed)

    async def _pair(self):
        room, tokens, _game, round_, _countdown, _secret = await self._prepare(3)
        groups = await database_sync_to_async(_groups)(round_)
        self.assertEqual(sorted(len(group) for group in groups), [1, 1, 2])
        pair = next(group for group in groups if len(group) == 2)
        impostors = sorted(
            (group[0] for group in groups if len(group) == 1),
            key=lambda player: player.name,
        )
        high, low = impostors
        first, second = pair
        await self._post_all(
            room.code,
            tokens,
            [
                (first.name, "point", [second.name, high.name]),
                (second.name, "point", [first.name, high.name]),
                (high.name, "v", []),
                (low.name, "v", []),
            ],
        )
        revealed = await self._close(room.code, round_)
        by_name = {row["name"]: row for row in revealed}
        self.assertEqual(by_name[first.name]["points"], 0)
        self.assertEqual(by_name[second.name]["points"], 0)
        self.assertEqual(by_name[high.name]["points"], 3)
        self.assertEqual(by_name[high.name]["pointed_by"], [first.name, second.name])
        self.assertEqual(by_name[low.name]["points"], 0)
        self.assertEqual(by_name[low.name]["pointed_by"], [])
        await self._assert_totals(_game, round_, revealed)

    async def _one_pointer(self):
        room, tokens, game, round_, _countdown, _secret = await self._prepare(2)
        groups = await database_sync_to_async(_groups)(round_)
        team = next(group for group in groups if len(group) == 3)
        impostor = next(group[0] for group in groups if len(group) == 1)
        correct, incomplete, outsider = team
        await self._post_all(
            room.code,
            tokens,
            [
                (
                    correct.name,
                    "point",
                    [incomplete.name, outsider.name],
                ),
                (incomplete.name, "point", [correct.name]),
                (
                    outsider.name,
                    "point",
                    [correct.name, incomplete.name, impostor.name],
                ),
                (impostor.name, "v", []),
            ],
        )
        revealed = await self._close(room.code, round_)
        by_name = {row["name"]: row for row in revealed}
        self.assertEqual(by_name[correct.name]["points"], 2)
        self.assertEqual(by_name[incomplete.name]["points"], 0)
        self.assertEqual(by_name[outsider.name]["points"], 0)
        self.assertEqual(by_name[impostor.name]["points"], 2)
        self.assertEqual(by_name[impostor.name]["pointed_by"], [outsider.name])
        await self._assert_totals(game, round_, revealed)

    async def _missing(self):
        room, tokens, _game, round_, countdown, secret = await self._prepare(2)
        await self._post(room.code, tokens["Ana"], "fist", [])
        await self._assert_hidden(room.code, tokens["Luis"], secret, countdown)
        events = await database_sync_to_async(publish_due)(
            room.code,
            round_.pk,
            round_.vote_closes_at,
        )
        self.assertEqual(
            [event[0] for event in events],
            [
                "round.countdown",
                "round.countdown",
                "round.countdown",
                "round.phase_changed",
                "round.revealed",
            ],
        )
        self.assertEqual([event[1]["mark"] for event in events[:3]], [2, 1, 0])
        self.assertEqual(events[3][1]["status"], "finished")
        revealed = {row["name"]: row for row in events[4][1]["results"]}
        self.assertEqual(revealed["Ana"]["gesture"], "fist")
        for name in ("Luis", "Nora", "Otto"):
            self.assertIsNone(revealed[name]["gesture"])
            self.assertEqual(revealed[name]["targets"], [])
            self.assertEqual(revealed[name]["points"], 0)
        again = await database_sync_to_async(publish_due)(
            room.code,
            round_.pk,
            round_.vote_closes_at,
        )
        self.assertEqual(again, [])
        late = await self._post(room.code, tokens["Luis"], "v", [])
        self.assertEqual(late.status_code, 404)
        self.assertEqual(late.json()["code"], "round_unavailable")
        status, votes = await database_sync_to_async(_choices)(round_.pk)
        self.assertEqual(status, Round.Status.FINISHED)
        self.assertEqual(votes, [("Ana", "fist")])
        awards = await database_sync_to_async(
            lambda: ScoreAward.objects.filter(round=round_).count()
        )()
        self.assertEqual(awards, 4)
        shown = await self._results(room.code, tokens["Ana"])
        self.assertEqual(shown.status_code, 200)
        self.assertEqual(shown.json(), events[4][1]["results"])

    async def _failed_award(self):
        room, tokens, _game, round_, _countdown, _secret = await self._prepare(2)
        groups = await database_sync_to_async(_groups)(round_)
        votes = []
        for group in groups:
            if len(group) == 1:
                votes.append((group[0].name, "fist", []))
                continue
            for player in group:
                votes.append(
                    (
                        player.name,
                        "point",
                        [other.name for other in group if other != player],
                    )
                )
        await self._post_all(room.code, tokens, votes)

        def _boom():
            with patch(
                "games.scoring.ScoreAward.objects.create",
                side_effect=RuntimeError,
            ):
                publish_due(room.code, round_.pk, round_.vote_closes_at)

        with self.assertRaises(RuntimeError):
            await database_sync_to_async(_boom)()
        stored = await database_sync_to_async(Round.objects.get)(pk=round_.pk)
        self.assertEqual(stored.status, Round.Status.VOTING)
        self.assertEqual(
            await database_sync_to_async(
                lambda: ScoreAward.objects.filter(round=stored).count()
            )(),
            0,
        )

    async def _prepare(self, deal_seed):
        room, tokens, game = await database_sync_to_async(playing_room)()
        await database_sync_to_async(start_round)(game, random.Random(1))
        with patch(
            "rooms.service.random.Random", return_value=random.Random(deal_seed)
        ):
            await database_sync_to_async(begin_conversation)(
                room.code,
                tokens["Ana"],
            )
        for name in ("Ana", "Luis", "Nora"):
            await database_sync_to_async(raise_hand)(room.code, tokens[name])
        channel = await _subscribe(room.code)
        closed = await database_sync_to_async(call_basta)(room.code, tokens["Otto"])
        phase = (await _receive(channel))["message"]
        countdown = (await _receive(channel))["message"]
        self.assertEqual(phase["payload"]["status"], "voting")
        self.assertEqual(countdown["payload"]["mark"], 3)
        self.assertNotIn("points", countdown["payload"])
        self.assertNotIn("gesture", countdown["payload"])
        secret = await database_sync_to_async(
            lambda: (
                closed.dealt_hands.select_related("card_copy__card")
                .first()
                .card_copy.card.text
            )
        )()
        self.assertNotIn(secret, json.dumps(countdown, ensure_ascii=False))
        closed.vote_closes_at = timezone.now() + timedelta(minutes=5)
        await database_sync_to_async(closed.save)(update_fields=["vote_closes_at"])
        return room, tokens, game, closed, countdown, secret

    async def _close(self, code, round_):
        events = await database_sync_to_async(publish_due)(
            code,
            round_.pk,
            round_.vote_closes_at,
        )
        self.assertEqual(
            [event[0] for event in events],
            [
                "round.countdown",
                "round.countdown",
                "round.countdown",
                "round.phase_changed",
                "round.revealed",
            ],
        )
        self.assertEqual(events[3][1]["status"], "finished")
        self.assertNotIn("gesture", events[3][1])
        return events[4][1]["results"]

    async def _assert_hidden(self, code, token, secret, countdown):
        public = await self._json(f"/api/rooms/{code}/round/", token)
        hidden = await self._results(code, token)
        rendered = json.dumps(
            {"round": public, "countdown": countdown},
            ensure_ascii=False,
        )
        self.assertNotIn("results", public)
        self.assertNotIn("gesture", public)
        self.assertNotIn("points", public)
        self.assertNotIn(secret, rendered)
        self.assertEqual(hidden.status_code, 409)
        self.assertEqual(hidden.json()["code"], "results_unavailable")
        self.assertNotIn(secret, json.dumps(hidden.json(), ensure_ascii=False))

    async def _assert_totals(self, game, round_, revealed):
        for row in revealed:
            participant = await database_sync_to_async(game.participants.get)(
                name=row["name"]
            )
            award = await database_sync_to_async(
                lambda player=participant: (
                    ScoreAward.objects.get(
                        round=round_,
                        participant=player,
                    ).points
                )
            )()
            total = await database_sync_to_async(total_points)(participant)
            self.assertEqual(row["points"], award)
            self.assertEqual(total, award)

    async def _post_all(self, code, tokens, votes):
        for name, gesture, targets in votes:
            response = await self._post(code, tokens[name], gesture, targets)
            self.assertEqual(response.status_code, 200, response.json())

    async def _post(self, code, token, gesture, targets):
        return await database_sync_to_async(self.client.post)(
            f"/api/rooms/{code}/vote/?token={quote(token)}",
            {"gesture": gesture, "targets": targets},
            format="json",
        )

    async def _results(self, code, token):
        return await database_sync_to_async(self.client.get)(
            f"/api/rooms/{code}/results/",
            {"token": token},
        )

    async def _json(self, path, token):
        response = await database_sync_to_async(self.client.get)(
            path,
            {"token": token},
        )
        self.assertEqual(response.status_code, 200, response.json())
        return response.json()

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = f"token={quote(token)}".encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        return communicator, json.loads(await communicator.receive_from())

    def _silent(self, communicator):
        while not communicator.output_queue.empty():
            message = communicator.output_queue.get_nowait()
            self.assertNotEqual(message["type"], "websocket.send")
