import random
import threading
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import connections
from django.test import TestCase, TransactionTestCase

from games.deck import InvalidRoundState, start_round
from games.models import SituationCard
from games.rounds import NotReadyToClose
from realtime.consumers import room_group_name
from rooms.service import (
    RoundUnavailable,
    begin_conversation,
    call_basta,
    create_room,
    own_card,
    raise_hand,
    round_state,
)
from rooms.test.test_hand import playing_room

HAND_FIELDS = {"code", "number", "name", "ready_count", "player_count"}
PHASE_FIELDS = {"code", "number", "status", "dealt_count", "discard_count"}


async def _subscribe(code):
    layer = get_channel_layer()
    channel = await layer.new_channel()
    await layer.group_add(room_group_name(code), channel)
    return channel


async def _receive(channel):
    return await get_channel_layer().receive(channel)


class BastaTests(TestCase):
    def setUp(self):
        async_to_sync(get_channel_layer().flush)()

    def test_hands_and_basta_publish_without_cards(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(1))
        card = SituationCard.objects.get(number=1)
        with self.captureOnCommitCallbacks(execute=True):
            begin_conversation(room.code, tokens["Ana"])

        with self.captureOnCommitCallbacks(execute=True):
            raise_hand(room.code, tokens["Ana"])
            channel = async_to_sync(_subscribe)(room.code)

        event = async_to_sync(_receive)(channel)["message"]
        self.assertEqual(event["type"], "round.hand_raised")
        self.assertEqual(set(event["payload"]), HAND_FIELDS)
        self.assertEqual(event["payload"]["name"], "Ana")
        self.assertEqual(event["payload"]["ready_count"], 1)
        self.assertEqual(event["payload"]["player_count"], 4)
        self.assertNotIn(card.text, str(event))
        self.assertNotIn(tokens["Ana"], str(event))

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            raise_hand(room.code, tokens["Ana"])
        self.assertEqual(callbacks, [])
        self.assertEqual(game.rounds.get().readies.count(), 1)

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(NotReadyToClose):
                call_basta(room.code, tokens["Otto"])
        self.assertEqual(callbacks, [])
        self.assertEqual(game.rounds.get().status, "conversation")

        with self.captureOnCommitCallbacks(execute=True):
            raise_hand(room.code, tokens["Luis"])
        with self.captureOnCommitCallbacks(execute=True):
            raise_hand(room.code, tokens["Nora"])
        with self.captureOnCommitCallbacks(execute=True):
            closed = call_basta(room.code, tokens["Otto"])
            channel = async_to_sync(_subscribe)(room.code)

        phase = async_to_sync(_receive)(channel)["message"]
        public = round_state(room.code, tokens["Luis"])
        private = own_card(room.code, tokens["Luis"])
        self.assertEqual(phase["type"], "round.phase_changed")
        self.assertEqual(set(phase["payload"]), PHASE_FIELDS)
        self.assertEqual(phase["payload"]["status"], "voting")
        self.assertNotIn(card.text, str(phase))
        self.assertNotIn(private["text"], str(public))
        self.assertEqual(public["ready_count"], 3)
        self.assertEqual(public["ready"], ["Ana", "Luis", "Nora"])
        self.assertNotIn("Otto", public["ready"])
        self.assertEqual(closed.status, "voting")
        self.assertEqual(closed.votes.count(), 0)
        self.assertEqual(game.rounds.count(), 1)

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            again = call_basta(room.code, tokens["Ana"])
        self.assertEqual(callbacks, [])
        self.assertEqual(again.pk, closed.pk)
        self.assertEqual(again.votes.count(), 0)

    def test_an_unauthorized_token_changes_nothing(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(2))
        with self.captureOnCommitCallbacks(execute=True):
            begin_conversation(room.code, tokens["Ana"])
        stranger = create_room("Sara")
        texts = list(SituationCard.objects.values_list("text", flat=True))
        player_id = str(game.participants.get(name="Ana").pk)

        for token in ("", player_id, stranger.access_token):
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                with self.assertRaises(RoundUnavailable) as raised:
                    raise_hand(room.code, token)
            self.assertEqual(callbacks, [])
            for text in texts:
                self.assertNotIn(text, str(raised.exception))
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                with self.assertRaises(RoundUnavailable):
                    call_basta(room.code, token)
            self.assertEqual(callbacks, [])

        self.assertEqual(game.rounds.get().readies.count(), 0)
        self.assertEqual(game.rounds.get().status, "conversation")

    def test_the_wrong_phase_does_not_raise_a_hand_or_vote(self):
        room, tokens, game = playing_room()
        prepared = start_round(game, random.Random(3))

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(InvalidRoundState):
                raise_hand(room.code, tokens["Ana"])
        self.assertEqual(callbacks, [])
        self.assertEqual(prepared.readies.count(), 0)

        with self.captureOnCommitCallbacks(execute=True):
            begin_conversation(room.code, tokens["Ana"])
        for name in ("Ana", "Luis", "Nora"):
            with self.captureOnCommitCallbacks(execute=True):
                raise_hand(room.code, tokens[name])
        with self.captureOnCommitCallbacks(execute=True):
            voting = call_basta(room.code, tokens["Otto"])

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(InvalidRoundState):
                raise_hand(room.code, tokens["Otto"])
        self.assertEqual(callbacks, [])
        voting.refresh_from_db()
        self.assertEqual(voting.status, "voting")
        self.assertEqual(voting.readies.count(), 3)
        self.assertEqual(voting.votes.count(), 0)

    def test_a_publish_failure_keeps_the_hand_and_the_close(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(4))
        with self.captureOnCommitCallbacks(execute=True):
            begin_conversation(room.code, tokens["Ana"])

        class BrokenLayer:
            async def group_send(self, group, message):
                raise ConnectionError("redis no disponible")

        with self.assertLogs("realtime.publish", level="ERROR"):
            with patch(
                "realtime.publish.get_channel_layer",
                return_value=BrokenLayer(),
            ):
                with self.captureOnCommitCallbacks(execute=True):
                    raise_hand(room.code, tokens["Ana"])
                    raise_hand(room.code, tokens["Luis"])
                    raise_hand(room.code, tokens["Nora"])
                    call_basta(room.code, tokens["Otto"])

        round_ = game.rounds.get()
        round_.refresh_from_db()
        self.assertEqual(round_.status, "voting")
        self.assertEqual(round_.readies.count(), 3)
        self.assertEqual(round_.votes.count(), 0)


class ConcurrentBastaTests(TransactionTestCase):
    def test_two_raises_from_one_player_count_once(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(5))
        begin_conversation(room.code, tokens["Ana"])
        barrier = threading.Barrier(2)
        errors = []

        def attempt():
            try:
                barrier.wait()
                raise_hand(room.code, tokens["Ana"])
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
        self.assertEqual(round_.readies.count(), 1)
        self.assertEqual(round_.status, "conversation")

    def test_two_basta_calls_open_voting_once(self):
        room, tokens, game = playing_room()
        start_round(game, random.Random(6))
        begin_conversation(room.code, tokens["Ana"])
        for name in ("Ana", "Luis", "Nora"):
            raise_hand(room.code, tokens[name])
        barrier = threading.Barrier(2)
        errors = []

        def attempt(token):
            try:
                barrier.wait()
                call_basta(room.code, token)
            except Exception as error:
                errors.append(error)
            finally:
                connections.close_all()

        connections.close_all()
        threads = [
            threading.Thread(target=attempt, args=(tokens["Otto"],)),
            threading.Thread(target=attempt, args=(tokens["Ana"],)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        round_ = game.rounds.get()
        round_.refresh_from_db()
        self.assertEqual(errors, [])
        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(round_.status, "voting")
        self.assertEqual(round_.readies.count(), 3)
        self.assertEqual(round_.votes.count(), 0)
