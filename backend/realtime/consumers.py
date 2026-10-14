import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from realtime.serializers import (
    ProtocolError,
    decode_client_message,
    encode_server_event,
)
from rooms.service import RoomNotFound, connection_access, get_room_state


def room_group_name(code):
    return f"room.{code.strip().upper()}"


class HealthConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, code):
        return None


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        code = self.scope["url_route"]["kwargs"]["code"]
        access = await _connection_access(code, _query_token(self.scope))
        if access != "ok":
            await self._reject(access)
            return
        await self.accept()
        group = room_group_name(code)
        await self.channel_layer.group_add(group, self.channel_name)
        try:
            snapshot = await _snapshot(code)
        except RoomNotFound:
            await self.channel_layer.group_discard(group, self.channel_name)
            await self._send_error(
                "room_not_found",
                "No existe una sala con ese código.",
            )
            await self.close()
            return
        await self.send(text_data=json.dumps(snapshot))

    async def disconnect(self, close_code):
        code = self.scope["url_route"]["kwargs"].get("code")
        if not isinstance(code, str) or self.channel_layer is None:
            return
        await self.channel_layer.group_discard(
            room_group_name(code),
            self.channel_name,
        )

    async def receive(self, text_data=None, bytes_data=None):
        code = self.scope["url_route"]["kwargs"]["code"]
        if await _connection_access(code, _query_token(self.scope)) != "ok":
            await self.channel_layer.group_discard(
                room_group_name(code),
                self.channel_name,
            )
            await self._send_error("unauthorized", "La conexión no está autorizada.")
            await self.close()
            return
        code_name, detail = _client_message_error(text_data)
        await self._send_error(code_name, detail)

    async def room_broadcast(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def _reject(self, access):
        if access == "missing":
            error = ("room_not_found", "No existe una sala con ese código.")
        else:
            error = ("unauthorized", "La conexión no está autorizada.")
        await self.accept()
        await self._send_error(*error)
        await self.close()

    async def _send_error(self, code, detail):
        event = encode_server_event(
            "connection.error",
            {"code": code, "detail": detail},
        )
        await self.send(text_data=json.dumps(event))


def _query_token(scope):
    raw = scope.get("query_string", b"")
    if isinstance(raw, str):
        raw = raw.encode()
    values = parse_qs(raw.decode("utf-8", "replace")).get("token", [])
    if len(values) != 1 or not values[0]:
        return ""
    return values[0]


def _client_message_error(text_data):
    if not isinstance(text_data, str):
        return "invalid_message", "El mensaje debe ser un objeto."
    try:
        message = json.loads(text_data)
    except json.JSONDecodeError:
        return "invalid_message", "El mensaje debe ser un objeto."
    try:
        decode_client_message(message)
    except ProtocolError as error:
        return error.code, str(error)
    return "invalid_message", "El mensaje no cambia la sala."


@database_sync_to_async
def _connection_access(code, token):
    return connection_access(code, token)


@database_sync_to_async
def _snapshot(code):
    state = get_room_state(code)
    payload = state._asdict()
    payload["participants"] = list(state.participants)
    return encode_server_event("room.snapshot", payload)
