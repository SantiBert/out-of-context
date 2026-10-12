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
        RoomMember.objects.create(room=room, name=cleaned, is_host=True)
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
        member = RoomMember.objects.create(
            room=room,
            name=cleaned_name,
            is_host=False,
        )
        if room.members.count() > MAX_ROOM_MEMBERS:
            raise RoomFull("La sala ya tiene 8 participantes.")
        return member


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
        member.delete()
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
