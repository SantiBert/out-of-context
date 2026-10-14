import hashlib
import logging
import secrets

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from games.models import Game, Participant
from rooms.models import (
    MAX_ROOM_MEMBERS,
    MIN_ROOM_MEMBERS,
    NAME_MAX_LENGTH,
    Room,
    RoomMember,
)
from rooms.state import RoomState

INVITATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6
CODE_ATTEMPTS = 5

logger = logging.getLogger(__name__)


class InvalidRoom(Exception):
    pass


class RoomError(Exception):
    code = "room_error"


class RoomNotFound(RoomError):
    code = "room_not_found"


class RoomClosed(RoomError):
    code = "room_closed"


class RoomFull(RoomError):
    code = "room_full"


class DuplicateMember(RoomError):
    code = "duplicate_member"


class HostCannotLeave(RoomError):
    code = "host_cannot_leave"


class MemberNotFound(RoomError):
    code = "member_not_found"


class NotHost(RoomError):
    code = "not_host"


class InvalidPlayerCount(RoomError):
    code = "invalid_player_count"


def create_room(name):
    cleaned = _clean_name(name)
    with transaction.atomic():
        room = _create_with_unique_code()
        token = _create_member(room, cleaned, is_host=True)
        room.access_token = token
        _schedule_events(room.code, [("room.snapshot", None)])
        return room


def join_room(code, name):
    cleaned_name = _clean_name(name)
    with transaction.atomic():
        room = _locked_room(code)
        if room.status != Room.Status.WAITING:
            raise RoomClosed("La sala no admite incorporaciones.")
        if room.members.filter(name=cleaned_name).exists():
            raise DuplicateMember("Ese nombre ya está en la sala.")
        if room.members.count() >= MAX_ROOM_MEMBERS:
            raise RoomFull("La sala ya tiene 8 participantes.")
        before = get_room_state(room.code)
        token = _create_member(room, cleaned_name, is_host=False)
        member = room.members.get(name=cleaned_name)
        member.access_token = token
        if room.members.count() > MAX_ROOM_MEMBERS:
            raise RoomFull("La sala ya tiene 8 participantes.")
        _schedule_membership(room.code, "room.player_joined", cleaned_name, before)
        return member


def member_for_token(code, token):
    if not isinstance(token, str) or not token:
        return None
    try:
        cleaned = _clean_code(code)
    except RoomNotFound:
        return None
    return RoomMember.objects.filter(
        room__code=cleaned,
        token_hash=_token_hash(token),
    ).first()


def connection_access(code, token):
    try:
        get_room_state(code)
    except RoomNotFound:
        return "missing"
    if member_for_token(code, token) is None:
        return "denied"
    return "ok"


def get_room_state(code):
    cleaned = _clean_code(code)
    room = Room.objects.filter(code=cleaned).first()
    if room is None:
        raise RoomNotFound("No existe una sala con ese código.")
    members = list(room.members.order_by("pk"))
    names = tuple(member.name for member in members)
    host = next(member.name for member in members if member.is_host)
    count = len(names)
    waiting = room.status == Room.Status.WAITING
    return RoomState(
        code=room.code,
        status=room.status,
        host=host,
        participants=names,
        player_count=count,
        accepting_members=waiting and count < MAX_ROOM_MEMBERS,
        can_start=waiting and MIN_ROOM_MEMBERS <= count <= MAX_ROOM_MEMBERS,
    )


def leave_room(code, name):
    cleaned_name = _clean_name(name)
    with transaction.atomic():
        room = _locked_room(code)
        if room.status != Room.Status.WAITING:
            raise RoomClosed("La sala ya no admite salidas.")
        member = room.members.filter(name=cleaned_name).first()
        if member is None:
            raise MemberNotFound("Ese participante no está en la sala.")
        if member.is_host:
            raise HostCannotLeave("El anfitrión no puede abandonar la sala.")
        before = get_room_state(room.code)
        member.delete()
        _schedule_membership(room.code, "room.player_left", cleaned_name, before)
        return room


def start_game(code, name):
    cleaned_name = _clean_name(name)
    with transaction.atomic():
        room = _locked_room(code)
        host = room.members.filter(is_host=True).first()
        if host is None or host.name != cleaned_name:
            raise NotHost("Solo el anfitrión puede iniciar la partida.")
        if room.game_id:
            return room.game
        if room.status != Room.Status.WAITING:
            raise RoomClosed("La sala no admite iniciar la partida.")
        members = list(room.members.order_by("pk"))
        if not MIN_ROOM_MEMBERS <= len(members) <= MAX_ROOM_MEMBERS:
            raise InvalidPlayerCount("La partida admite entre 4 y 8 participantes.")
        game = Game.objects.create()
        for member in members:
            Participant.objects.create(game=game, name=member.name)
        room.game = game
        room.status = Room.Status.STARTED
        room.save()
        _schedule_events(
            room.code,
            [("game.started", None), ("room.state_changed", None)],
        )
        return game


def _clean_name(name):
    if not isinstance(name, str):
        raise InvalidRoom("El nombre no puede estar vacío.")
    cleaned = name.strip()
    if not cleaned:
        raise InvalidRoom("El nombre no puede estar vacío.")
    if len(cleaned) > NAME_MAX_LENGTH:
        raise InvalidRoom("El nombre admite como máximo 80 caracteres.")
    return cleaned


def _locked_room(code):
    cleaned = _clean_code(code)
    room = Room.objects.select_for_update().filter(code=cleaned).first()
    if room is None:
        raise RoomNotFound("No existe una sala con ese código.")
    return room


def _clean_code(code):
    if not isinstance(code, str):
        raise RoomNotFound("No existe una sala con ese código.")
    cleaned = code.strip().upper()
    if not cleaned:
        raise RoomNotFound("No existe una sala con ese código.")
    return cleaned


def _create_with_unique_code():
    for _attempt in range(CODE_ATTEMPTS):
        try:
            with transaction.atomic():
                return Room.objects.create(
                    code=_invitation_code(),
                    status=Room.Status.WAITING,
                )
        except IntegrityError:
            continue
        except ValidationError as error:
            if "code" not in error.error_dict:
                raise
            continue
    raise InvalidRoom("No se pudo generar un código de invitación único.")


def _invitation_code():
    return "".join(secrets.choice(INVITATION_ALPHABET) for _index in range(CODE_LENGTH))


def _create_member(room, name, is_host):
    token = secrets.token_urlsafe(32)
    RoomMember.objects.create(
        room=room,
        name=name,
        is_host=is_host,
        token_hash=_token_hash(token),
    )
    return token


def _token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def _schedule_membership(code, kind, name, before):
    notices = [(kind, name)]
    after = get_room_state(code)
    if _public_change(before, after):
        notices.append(("room.state_changed", None))
    _schedule_events(code, notices)


def _public_change(before, after):
    return (before.status, before.accepting_members, before.can_start) != (
        after.status,
        after.accepting_members,
        after.can_start,
    )


def _schedule_events(code, notices):
    def send():
        try:
            from realtime.publish import publish_room_events

            state = get_room_state(code)
            publish_room_events(
                code,
                [_event_payload(state, kind, name) for kind, name in notices],
            )
        except Exception:
            logger.exception("No se publicaron los eventos de la sala %s.", code)

    transaction.on_commit(send)


def _event_payload(state, kind, name):
    payload = state._asdict()
    payload["participants"] = list(state.participants)
    if name is not None:
        payload["name"] = name
    return kind, payload
