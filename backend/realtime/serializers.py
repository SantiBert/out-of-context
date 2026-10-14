from rest_framework import serializers

SERVER_EVENT_TYPES = (
    "room.snapshot",
    "room.player_joined",
    "room.player_left",
    "room.state_changed",
    "game.started",
    "connection.error",
)

ROOM_EVENT_TYPES = (
    "room.snapshot",
    "room.player_joined",
    "room.player_left",
    "room.state_changed",
    "game.started",
)


class ProtocolError(Exception):
    code = "invalid_message"


class InvalidMessage(ProtocolError):
    code = "invalid_message"


class UnknownType(ProtocolError):
    code = "unknown_type"


class ServerOnly(ProtocolError):
    code = "server_only"


class _StrictSerializer(serializers.Serializer):
    def validate(self, attrs):
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError("El mensaje incluye campos no públicos.")
        return attrs


class RoomEventPayloadSerializer(_StrictSerializer):
    code = serializers.CharField()
    status = serializers.CharField()
    host = serializers.CharField()
    participants = serializers.ListField(
        child=serializers.CharField(), allow_empty=False
    )
    player_count = serializers.IntegerField(min_value=1)
    accepting_members = serializers.BooleanField()
    can_start = serializers.BooleanField()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs["player_count"] != len(attrs["participants"]):
            raise serializers.ValidationError(
                "La cantidad no coincide con los participantes."
            )
        if attrs["host"] not in attrs["participants"]:
            raise serializers.ValidationError(
                "El anfitrión no está entre los participantes."
            )
        if len(set(attrs["participants"])) != len(attrs["participants"]):
            raise serializers.ValidationError("Hay un nombre repetido.")
        return attrs


class MembershipEventPayloadSerializer(RoomEventPayloadSerializer):
    name = serializers.CharField()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        event_type = self.context["event_type"]
        if (
            event_type == "room.player_joined"
            and attrs["name"] not in attrs["participants"]
        ):
            raise serializers.ValidationError("Quien entra no está en la sala.")
        if event_type == "room.player_left" and attrs["name"] in attrs["participants"]:
            raise serializers.ValidationError("Quien sale sigue en la sala.")
        return attrs


class ConnectionErrorPayloadSerializer(_StrictSerializer):
    code = serializers.CharField()
    detail = serializers.CharField()


def decode_client_message(message):
    if not isinstance(message, dict):
        raise InvalidMessage("El mensaje debe ser un objeto.")
    if set(message) - {"type", "payload"}:
        raise InvalidMessage("El mensaje incluye campos no públicos.")
    event_type = message.get("type", serializers.empty)
    payload = message.get("payload", serializers.empty)
    if event_type is serializers.empty or payload is serializers.empty:
        raise InvalidMessage("El mensaje necesita type y payload.")
    if not isinstance(event_type, str) or not isinstance(payload, dict):
        raise InvalidMessage("type debe ser texto y payload un objeto.")
    if event_type in SERVER_EVENT_TYPES:
        raise ServerOnly("Ese evento solo lo emite el servidor.")
    raise UnknownType("El tipo de evento no existe.")


def encode_server_event(event_type, payload):
    if event_type not in SERVER_EVENT_TYPES:
        raise UnknownType("El tipo de evento no existe.")
    serializer = _payload_serializer(event_type, payload)
    if not serializer.is_valid():
        raise InvalidMessage("El payload no es válido.")
    return {"type": event_type, "payload": serializer.validated_data}


def _payload_serializer(event_type, payload):
    if event_type == "connection.error":
        return ConnectionErrorPayloadSerializer(data=payload)
    if event_type in ("room.player_joined", "room.player_left"):
        return MembershipEventPayloadSerializer(
            data=payload,
            context={"event_type": event_type},
        )
    return RoomEventPayloadSerializer(data=payload)
