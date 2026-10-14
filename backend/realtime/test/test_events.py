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

    def test_an_unknown_server_type_is_rejected(self):
        with self.assertRaises(UnknownType) as raised:
            encode_server_event("round.dealt", PUBLIC_ROOM)
        self.assertEqual(raised.exception.code, "unknown_type")


class ClientMessageTests(SimpleTestCase):
    def test_a_server_event_from_the_client_is_rejected(self):
        with self.assertRaises(ServerOnly) as raised:
            decode_client_message(
                {"type": "game.started", "payload": room_after_start()}
            )
        self.assertEqual(raised.exception.code, "server_only")

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
