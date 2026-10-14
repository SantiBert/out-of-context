from django.test import SimpleTestCase

from realtime.serializers import (
    InvalidMessage,
    ServerOnly,
    UnknownType,
    decode_client_message,
    encode_server_event,
)

PUBLIC_ROOM = {
    "code": "AB12CD",
    "status": "waiting",
    "host": "Ana",
    "participants": ["Ana", "Luis"],
    "player_count": 2,
    "accepting_members": True,
    "can_start": False,
}


def room_after_start():
    payload = dict(PUBLIC_ROOM)
    payload["status"] = "started"
    payload["accepting_members"] = False
    payload["can_start"] = False
    return payload


class ServerEventTests(SimpleTestCase):
    def test_each_public_event_has_type_and_payload(self):
        joined = dict(PUBLIC_ROOM, name="Luis")
        left = dict(room_after_start(), name="Otto")
        left["participants"] = ["Ana"]
        left["player_count"] = 1
        cases = {
            "room.snapshot": PUBLIC_ROOM,
            "room.player_joined": joined,
            "room.player_left": left,
            "room.state_changed": PUBLIC_ROOM,
            "game.started": room_after_start(),
            "round.phase_changed": {
                "code": "AB12CD",
                "number": 1,
                "status": "conversation",
                "dealt_count": 4,
                "discard_count": 5,
            },
            "round.hand_raised": {
                "code": "AB12CD",
                "number": 1,
                "name": "Ana",
                "ready_count": 1,
                "player_count": 4,
            },
            "round.countdown": {
                "code": "AB12CD",
                "number": 1,
                "mark": 3,
                "opened_at": "2026-10-14T03:00:00+00:00",
                "closes_at": "2026-10-14T03:00:03+00:00",
            },
            "connection.error": {
                "code": "invalid_message",
                "detail": "El payload no es válido.",
            },
        }

        for event_type, payload in cases.items():
            with self.subTest(event_type=event_type):
                event = encode_server_event(event_type, payload)
                self.assertEqual(event["type"], event_type)
                self.assertEqual(set(event), {"type", "payload"})
                self.assertNotIn("pk", event["payload"])

    def test_a_payload_with_private_or_missing_fields_is_rejected(self):
        with_card = dict(PUBLIC_ROOM, card="Una carta secreta")
        with_role = dict(PUBLIC_ROOM, role="impostor")
        with_vote = dict(PUBLIC_ROOM, vote="fist")
        with_pk = dict(PUBLIC_ROOM, pk=1)
        missing_host = dict(PUBLIC_ROOM)
        del missing_host["host"]
        wrong_count = dict(PUBLIC_ROOM, player_count=1)

        for payload in (
            with_card,
            with_role,
            with_vote,
            with_pk,
            missing_host,
            wrong_count,
        ):
            with self.subTest(payload=sorted(payload)):
                with self.assertRaises(InvalidMessage) as raised:
                    encode_server_event("room.snapshot", payload)
                self.assertEqual(raised.exception.code, "invalid_message")

    def test_a_phase_payload_rejects_secret_fields(self):
        payload = {
            "code": "AB12CD",
            "number": 1,
            "status": "conversation",
            "dealt_count": 4,
            "discard_count": 5,
            "card": "Una carta secreta",
            "role": "impostor",
        }
        with self.assertRaises(InvalidMessage):
            encode_server_event("round.phase_changed", payload)

    def test_a_countdown_payload_rejects_secret_fields(self):
        payload = {
            "code": "AB12CD",
            "number": 1,
            "mark": 3,
            "opened_at": "2026-10-14T03:00:00+00:00",
            "closes_at": "2026-10-14T03:00:03+00:00",
            "gesture": "fist",
            "card": "Una carta secreta",
        }
        with self.assertRaises(InvalidMessage):
            encode_server_event("round.countdown", payload)

    def test_a_hand_payload_rejects_secret_fields(self):
        payload = {
            "code": "AB12CD",
            "number": 1,
            "name": "Ana",
            "ready_count": 1,
            "player_count": 4,
            "card": "Una carta secreta",
            "role": "impostor",
        }
        with self.assertRaises(InvalidMessage):
            encode_server_event("round.hand_raised", payload)

    def test_an_unknown_server_type_is_rejected(self):
        with self.assertRaises(UnknownType) as raised:
            encode_server_event("round.dealt", PUBLIC_ROOM)
        self.assertEqual(raised.exception.code, "unknown_type")


class ClientMessageTests(SimpleTestCase):
    def test_a_client_cannot_declare_the_phase(self):
        with self.assertRaises(ServerOnly) as raised:
            decode_client_message(
                {
                    "type": "round.phase_changed",
                    "payload": {
                        "code": "AB12CD",
                        "number": 1,
                        "status": "voting",
                        "dealt_count": 4,
                        "discard_count": 5,
                    },
                }
            )
        self.assertEqual(raised.exception.code, "server_only")

    def test_a_client_cannot_declare_the_countdown(self):
        with self.assertRaises(ServerOnly) as raised:
            decode_client_message(
                {
                    "type": "round.countdown",
                    "payload": {
                        "code": "AB12CD",
                        "number": 1,
                        "mark": 0,
                        "opened_at": "2026-10-14T03:00:00+00:00",
                        "closes_at": "2026-10-14T03:00:03+00:00",
                    },
                }
            )
        self.assertEqual(raised.exception.code, "server_only")

    def test_a_client_cannot_declare_a_raised_hand(self):
        with self.assertRaises(ServerOnly) as raised:
            decode_client_message(
                {
                    "type": "round.hand_raised",
                    "payload": {
                        "code": "AB12CD",
                        "number": 1,
                        "name": "Ana",
                        "ready_count": 4,
                        "player_count": 4,
                    },
                }
            )
        self.assertEqual(raised.exception.code, "server_only")

    def test_a_server_event_from_the_client_is_rejected(self):
        with self.assertRaises(ServerOnly) as raised:
            decode_client_message(
                {"type": "game.started", "payload": room_after_start()}
            )
        self.assertEqual(raised.exception.code, "server_only")

    def test_a_command_accepts_only_an_empty_payload(self):
        command = decode_client_message(
            {"type": "round.raise_hand", "payload": {}},
        )
        self.assertEqual(command, "round.raise_hand")
        with self.assertRaises(InvalidMessage):
            decode_client_message(
                {
                    "type": "round.basta",
                    "payload": {"ready_count": 4, "name": "Ana"},
                },
            )

    def test_an_unknown_type_is_rejected(self):
        with self.assertRaises(UnknownType) as raised:
            decode_client_message({"type": "room.join", "payload": {}})
        self.assertEqual(raised.exception.code, "unknown_type")

    def test_a_message_without_type_or_payload_is_rejected(self):
        for message in ({"payload": {}}, {"type": "room.snapshot"}, {}, "hola", None):
            with self.subTest(message=message):
                with self.assertRaises(InvalidMessage) as raised:
                    decode_client_message(message)
                self.assertEqual(raised.exception.code, "invalid_message")
