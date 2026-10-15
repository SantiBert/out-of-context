import asyncio
import json
import random
from urllib.parse import quote

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from config.asgi import application
from games.deck import (
    InsufficientPiles,
    RoundStillOpen,
    create_piles,
    deck_config,
    start_round,
)
from games.models import GamePile
from games.test.test_deck import finish_round, make_cards
from rooms.models import Room
from rooms.service import begin_conversation, raise_hand, start_game

NAMES = ("Ana", "Luis", "Nora", "Otto", "Eva", "Ian", "Leo", "Pia")
NEEDED = {4: 3, 5: 3, 6: 4, 7: 4, 8: 5}
ROOM_FIELDS = {
    "code",
    "status",
    "host",
    "participants",
    "player_count",
    "accepting_members",
    "can_start",
}
ROUND_FIELDS = {
    "number",
    "status",
    "participant_ids",
    "dealt_count",
    "discard_count",
    "ready_count",
    "ready",
}


class RoundCycleTests(TransactionTestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()
        self.client = APIClient()

    def test_each_player_count_reaches_voting_without_leaking_cards(self):
        card_start = 1
        for count in (4, 5, 6, 7, 8):
            with self.subTest(players=count):
                async_to_sync(get_channel_layer().flush)()
                async_to_sync(self._cycle)(count, card_start)
            card_start += deck_config(count).pile_count

    def test_failed_preparation_does_not_open_another_round(self):
        async_to_sync(self._failures)()

    def test_repeats_privacy_and_reconnect_stay_on_one_round(self):
        async_to_sync(self._edges)()

    def test_two_basta_commands_vote_once(self):
        async_to_sync(self._concurrent_basta)()

    async def _cycle(self, count, card_start):
        names = NAMES[:count]
        code, members = await self._table(names, card_start)
        needed = NEEDED[count]
        hands = await self._hands(code)
        room = await self._json(f"/api/rooms/{code}/")
        public = await self._json(f"/api/rooms/{code}/round/", members[names[0]])
        self.assertEqual(set(room), ROOM_FIELDS)
        self.assertEqual(public["status"], "conversation")
        self.assertEqual(public["dealt_count"], count)
        self.assertEqual(public["ready"], [])
        rendered = json.dumps({"room": room, "round": public})
        for name, token in members.items():
            card = await self._json(f"/api/rooms/{code}/card/", token)
            self.assertEqual(card, hands[name])
            self.assertEqual(set(card), {"number", "text"})
            self.assertNotIn(card["text"], rendered)

        host, host_snapshot = await self._open(code, members[names[0]])
        second, _second_snapshot = await self._open(code, members[names[1]])
        try:
            self.assertNotIn(hands[names[0]]["text"], json.dumps(host_snapshot))
            await host.send_json_to({"type": "round.basta", "payload": {}})
            early = await self._next(host)
            self.assertEqual(early["payload"]["code"], "not_ready")
            self._silent(second)
            self.assertEqual(
                (await self._json(f"/api/rooms/{code}/round/", members[names[0]]))[
                    "status"
                ],
                "conversation",
            )

            await self._raise(host, second)
            await self._raise(second, host)
            for name in names[2:needed]:
                await self._raise_new(code, members[name], host, second)

            closer, _snapshot = await self._open(code, members[names[needed]])
            try:
                await closer.send_json_to({"type": "round.basta", "payload": {}})
                closed = await self._next(closer)
                host_closed = await self._next(host)
                second_closed = await self._next(second)
            finally:
                await closer.disconnect()
            self.assertEqual(closed["type"], "round.phase_changed")
            self.assertEqual(closed["payload"]["status"], "voting")
            self.assertEqual(closed, host_closed)
            self.assertEqual(closed, second_closed)
            self.assertNotIn(hands[names[0]]["text"], json.dumps(closed))
        finally:
            await host.disconnect()
            await second.disconnect()

        public = await self._json(f"/api/rooms/{code}/round/", members[names[0]])
        facts = await self._facts(code)
        self.assertEqual(public["status"], "voting")
        self.assertEqual(public["ready_count"], needed)
        self.assertEqual(public["ready"], sorted(names[:needed]))
        self.assertEqual(facts["rounds"], 1)
        self.assertEqual(facts["votes"], 0)
        self.assertNotIn(hands[names[0]]["text"], json.dumps(public))

    async def _failures(self):
        code, members = await self._table(NAMES[:4], 1)
        await self._exhaust(code)
        finished = await self._response(f"/api/rooms/{code}/round/", members["Ana"])
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(finished.json()["status"], "finished")
        self.assertNotIn("results", finished.json())
        self.assertNotIn("gesture", finished.json())
        self.assertEqual((await self._facts(code))["rounds"], 1)

        bare = await self._create("Ana")
        for name in NAMES[1:4]:
            await self._join(bare["code"], name)
        await self._start(bare["code"])
        self.assertEqual((await self._facts(bare["code"]))["rounds"], 0)
        unavailable = await self._response(
            f"/api/rooms/{bare['code']}/round/",
            bare["token"],
        )
        self.assertEqual(unavailable.status_code, 404)
        self.assertEqual(unavailable.json()["code"], "round_unavailable")

    async def _edges(self):
        code, members = await self._table(NAMES[:4], 1)
        other = await self._create("Sara")
        foreign = await self._response(f"/api/rooms/{code}/card/", other["token"])
        self.assertEqual(foreign.status_code, 401)
        self.assertEqual(foreign.json()["code"], "unauthorized")

        host, _snapshot = await self._open(code, members["Ana"])
        other_socket, _other = await self._open(other["code"], other["token"])
        try:
            await self._raise(host)
            await host.send_json_to({"type": "round.raise_hand", "payload": {}})
            self._silent(host)
            self._silent(other_socket)
            self.assertEqual(
                (await self._json(f"/api/rooms/{code}/round/", members["Ana"]))[
                    "ready_count"
                ],
                1,
            )

            await self._raise_new(code, members["Luis"], host)
            await self._raise_new(code, members["Nora"], host)
            closer, _closer_snapshot = await self._open(code, members["Otto"])
            try:
                await closer.send_json_to({"type": "round.basta", "payload": {}})
                await self._next(closer)
                await self._next(host)
                await self._next(closer)
                await self._next(host)
                await closer.send_json_to({"type": "round.basta", "payload": {}})
                self._silent(closer)
                self._silent(host)
            finally:
                await closer.disconnect()

            await host.send_json_to(
                {
                    "type": "round.hand_raised",
                    "payload": {
                        "code": code,
                        "number": 1,
                        "name": "Ana",
                        "ready_count": 4,
                        "player_count": 4,
                    },
                },
            )
            rejected = await self._next(host)
            self.assertEqual(rejected["payload"]["code"], "server_only")
            await host.disconnect()
            host = None
            card = await self._json(f"/api/rooms/{code}/card/", members["Ana"])
            public = await self._json(f"/api/rooms/{code}/round/", members["Ana"])
            self.assertEqual(public["status"], "voting")
            self.assertEqual(public["ready_count"], 3)
            self.assertNotIn(card["text"], json.dumps(public))
            reopened, snapshot = await self._open(code, members["Ana"])
            self.assertEqual(snapshot["type"], "room.snapshot")
            self.assertNotIn(card["text"], json.dumps(snapshot))
            await reopened.disconnect()
            facts = await self._facts(code)
            self.assertEqual(facts["rounds"], 1)
            self.assertEqual(facts["votes"], 0)
            self.assertEqual(facts["readies"], 3)
            await self._second_round_rejected(code)
        finally:
            if host is not None:
                await host.disconnect()
            await other_socket.disconnect()

        prepared = await self._create("Ana")
        for name in NAMES[1:4]:
            await self._join(prepared["code"], name)
        await self._prepare(prepared["code"], 20)
        early, _snapshot = await self._open(prepared["code"], prepared["token"])
        try:
            await early.send_json_to({"type": "round.raise_hand", "payload": {}})
            event = await self._next(early)
            self.assertEqual(event["payload"]["code"], "invalid_round")
            state = await self._json(
                f"/api/rooms/{prepared['code']}/round/",
                prepared["token"],
            )
            self.assertEqual(state["status"], "prepared")
            self.assertEqual(state["ready_count"], 0)
        finally:
            await early.disconnect()

    async def _concurrent_basta(self):
        code, members = await self._table(NAMES[:4], 1)
        await self._ready(code, members, ("Ana", "Luis", "Nora"))
        host, _host_snapshot = await self._open(code, members["Ana"])
        otto, _otto_snapshot = await self._open(code, members["Otto"])
        try:
            await asyncio.gather(
                host.send_json_to({"type": "round.basta", "payload": {}}),
                otto.send_json_to({"type": "round.basta", "payload": {}}),
            )
            first = await self._next(host)
            second = await self._next(otto)
            self.assertEqual(first["type"], "round.phase_changed")
            self.assertEqual(second["type"], "round.phase_changed")
            self.assertEqual(first["payload"]["status"], "voting")
            host_count = await self._next(host)
            otto_count = await self._next(otto)
            self.assertEqual(host_count["type"], "round.countdown")
            self.assertEqual(otto_count["type"], "round.countdown")
            self.assertEqual(host_count["payload"]["mark"], 3)
            self._silent(host)
            self._silent(otto)
        finally:
            await host.disconnect()
            await otto.disconnect()
        facts = await self._facts(code)
        self.assertEqual(facts["rounds"], 1)
        self.assertEqual(facts["status"], "voting")
        self.assertEqual(facts["votes"], 0)
        self.assertEqual(facts["readies"], 3)

    async def _raise(self, sender, *listeners):
        await sender.send_json_to({"type": "round.raise_hand", "payload": {}})
        event = await self._next(sender)
        self.assertEqual(event["type"], "round.hand_raised")
        for listener in listeners:
            self.assertEqual(await self._next(listener), event)
        return event

    async def _raise_new(self, code, token, *listeners):
        communicator, _snapshot = await self._open(code, token)
        try:
            await self._raise(communicator, *listeners)
        finally:
            await communicator.disconnect()

    async def _table(self, names, card_start):
        host = await self._create(names[0])
        members = {names[0]: host["token"]}
        for name in names[1:]:
            joined = await self._join(host["code"], name)
            members[name] = joined["token"]
        await self._conversation(host["code"], host["token"], card_start, len(names))
        return host["code"], members

    async def _create(self, name):
        response = await database_sync_to_async(self.client.post)(
            "/api/rooms/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    async def _join(self, code, name):
        response = await database_sync_to_async(self.client.post)(
            f"/api/rooms/{code}/members/",
            {"name": name},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    async def _response(self, path, token=None):
        params = {"token": token} if token is not None else None
        return await database_sync_to_async(self.client.get)(path, params)

    async def _json(self, path, token=None):
        response = await self._response(path, token)
        self.assertEqual(response.status_code, 200, response.json())
        return response.json()

    async def _open(self, code, token):
        communicator = WebsocketCommunicator(application, f"/ws/rooms/{code}/")
        communicator.scope["query_string"] = f"token={quote(token)}".encode()
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        event = await self._next(communicator)
        self.assertNotIn(token, json.dumps(event))
        return communicator, event

    async def _next(self, communicator):
        return json.loads(await communicator.receive_from())

    def _silent(self, communicator):
        while not communicator.output_queue.empty():
            message = communicator.output_queue.get_nowait()
            self.assertNotEqual(message["type"], "websocket.send")

    @database_sync_to_async
    def _conversation(self, code, token, card_start, count):
        game = start_game(code, "Ana")
        config = deck_config(count)
        create_piles(game, make_cards(config.pile_count, start=card_start))
        start_round(game, random.Random(count))
        begin_conversation(code, token)

    @database_sync_to_async
    def _prepare(self, code, card_start):
        game = start_game(code, "Ana")
        create_piles(game, make_cards(15, start=card_start))
        start_round(game, random.Random(1))

    @database_sync_to_async
    def _start(self, code):
        game = start_game(code, "Ana")
        with self.assertRaises(InsufficientPiles):
            start_round(game, random.Random(1))

    @database_sync_to_async
    def _exhaust(self, code):
        game = Room.objects.get(code=code).game
        first = game.rounds.get()
        finish_round(first)
        used = set(first.piles.values_list("card_id", flat=True))
        GamePile.objects.filter(game=game).exclude(card_id__in=used).delete()
        with self.assertRaises(InsufficientPiles):
            start_round(game, random.Random(2))
        self.assertEqual(game.rounds.count(), 1)

    @database_sync_to_async
    def _second_round_rejected(self, code):
        game = Room.objects.get(code=code).game
        with self.assertRaises(RoundStillOpen):
            start_round(game, random.Random(9))
        self.assertEqual(game.rounds.count(), 1)

    @database_sync_to_async
    def _ready(self, code, members, names):
        for name in names:
            raise_hand(code, members[name])

    @database_sync_to_async
    def _hands(self, code):
        game = Room.objects.get(code=code).game
        round_ = game.rounds.get()
        return {
            hand.participant.name: {
                "number": hand.card_copy.card.number,
                "text": hand.card_copy.card.text,
            }
            for hand in round_.dealt_hands.select_related(
                "participant",
                "card_copy__card",
            )
        }

    @database_sync_to_async
    def _facts(self, code):
        game = Room.objects.get(code=code).game
        rounds = list(game.rounds.all())
        if not rounds:
            return {"rounds": 0, "status": None, "votes": 0, "readies": 0}
        round_ = rounds[0]
        return {
            "rounds": len(rounds),
            "status": round_.status,
            "votes": round_.votes.count(),
            "readies": round_.readies.count(),
        }
