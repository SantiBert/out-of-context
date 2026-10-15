import hashlib
import logging
import random
import secrets
import sys
import threading

from django.core.exceptions import ValidationError
from django.db import IntegrityError, connections, transaction
from django.utils import timezone

from games.deck import (
    GameFinished,
    InvalidRoundState,
    deal_round,
    private_hand,
    round_public_view,
)
from games.models import DealtHand, Game, Participant, Round
from games.rounds import declare_conversation_end, mark_ready
from games.scoring import (
    InvalidVote,
    close_vote,
    reveal_results,
    submit_vote,
)
from games.voting import countdown_mark, due_marks
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


class CardUnavailable(RoomError):
    code = "card_unavailable"


class RoundUnavailable(RoomError):
    code = "round_unavailable"


class ResultsUnavailable(RoomError):
    code = "results_unavailable"


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


@transaction.atomic
def begin_conversation(code, token):
    member = _member_of_game(code, token)
    game = Game.objects.select_for_update().get(pk=member.room.game_id)
    if game.status == Game.Status.FINISHED:
        raise GameFinished("La partida ya terminó.")
    round_ = _open_round(game)
    if round_ is None:
        raise RoundUnavailable("No hay una ronda preparada.")
    if round_.status == Round.Status.CONVERSATION:
        return round_
    if round_.status != Round.Status.PREPARED:
        raise InvalidRoundState("La ronda no admite la conversación.")
    participants = list(game.participants.order_by("pk"))
    try:
        dealt = deal_round(round_, participants, random.Random())
    except InvalidRoundState:
        round_.refresh_from_db()
        if round_.status == Round.Status.CONVERSATION:
            return round_
        raise
    _schedule_phase(member.room.code, dealt.pk)
    return dealt


@transaction.atomic
def raise_hand(code, token):
    member, participant, round_ = _round_actor(code, token)
    round_ = Round.objects.select_for_update().get(pk=round_.pk)
    existed = round_.readies.filter(participant=participant).exists()
    mark_ready(round_, participant)
    if not existed:
        _schedule_hand(member.room.code, round_.pk, member.name)
    return round_


@transaction.atomic
def call_basta(code, token):
    member, participant, round_ = _round_actor(code, token)
    round_ = Round.objects.select_for_update().get(pk=round_.pk)
    before = round_.status
    closed = declare_conversation_end(round_, participant)
    if before != Round.Status.VOTING and closed.status == Round.Status.VOTING:
        _schedule_phase(member.room.code, closed.pk, Round.Status.VOTING)
    return closed


def cast_vote(code, token, gesture, targets):
    member, participant, round_ = _round_actor(code, token)
    if not isinstance(targets, list) or any(
        not isinstance(name, str) for name in targets
    ):
        raise InvalidVote("El objetivo no pertenece a la ronda.")
    names = {player.name: player.pk for player in member.room.game.participants.all()}
    resolved = []
    for name in targets:
        if name not in names:
            raise InvalidVote("El objetivo no pertenece a la ronda.")
        resolved.append(names[name])
    choice = submit_vote(round_, participant, gesture, resolved)
    return {
        "gesture": choice.gesture,
        "targets": sorted(name for name, pk in names.items() if pk in choice.targets),
    }


def round_state(code, token):
    member = _member_of_game(code, token)
    round_ = _visible_round(member.room.game)
    if round_ is None:
        raise RoundUnavailable("No hay una ronda en curso.")
    view = round_public_view(round_)
    view["vote_opened_at"] = round_.vote_opened_at
    view["vote_closes_at"] = round_.vote_closes_at
    view["vote_mark"] = countdown_mark(round_)
    view["ready_count"] = round_.readies.count()
    view["ready"] = list(
        round_.readies.order_by("participant__name").values_list(
            "participant__name",
            flat=True,
        )
    )
    if round_.status == Round.Status.FINISHED and round_.score_awards.exists():
        view["results"] = reveal_results(round_)
    return view


def stored_results(code, token):
    member = _member_of_game(code, token)
    round_ = _visible_round(member.room.game)
    if round_ is None:
        raise RoundUnavailable("No hay una ronda en curso.")
    if not round_.score_awards.exists():
        raise ResultsUnavailable("Los resultados todavía no están disponibles.")
    return reveal_results(round_)


def _round_actor(code, token):
    member = _member_of_game(code, token)
    participant = member.room.game.participants.filter(name=member.name).first()
    round_ = _open_round(member.room.game)
    if participant is None or round_ is None:
        raise RoundUnavailable("No hay una ronda para este jugador.")
    return member, participant, round_


def _member_of_game(code, token):
    member = member_for_token(code, token)
    if member is None or member.room.game_id is None:
        raise RoundUnavailable("No hay una ronda para este jugador.")
    return member


def _open_round(game):
    return game.rounds.exclude(status=Round.Status.FINISHED).order_by("-number").first()


def _visible_round(game):
    opened = _open_round(game)
    if opened is not None:
        return opened
    return game.rounds.filter(status=Round.Status.FINISHED).order_by("-number").first()


def own_card(code, token):
    member = member_for_token(code, token)
    if member is None or member.room.game_id is None:
        raise CardUnavailable("No hay una carta para este jugador.")
    participant = member.room.game.participants.filter(name=member.name).first()
    round_ = _open_dealt_round(member.room.game)
    if participant is None or round_ is None:
        raise CardUnavailable("No hay una carta para este jugador.")
    try:
        card_copy = private_hand(round_, participant)
    except DealtHand.DoesNotExist:
        raise CardUnavailable("No hay una carta para este jugador.") from None
    return {"number": card_copy.card.number, "text": card_copy.card.text}


def _open_dealt_round(game):
    return (
        game.rounds.filter(
            status__in=(Round.Status.CONVERSATION, Round.Status.VOTING),
        )
        .order_by("-number")
        .first()
    )


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


def _schedule_phase(code, round_id, status=Round.Status.CONVERSATION):
    def send():
        try:
            from realtime.publish import publish_room_events

            round_ = Round.objects.filter(pk=round_id).first()
            if round_ is None or round_.status != status:
                return
            events = [("round.phase_changed", _phase_payload(code, round_))]
            if status == Round.Status.VOTING:
                events.extend(claim_due(code, round_.pk))
                arm_countdown(code, round_.pk)
            publish_room_events(code, events)
        except Exception:
            logger.exception("No se publicaron los eventos de la sala %s.", code)

    transaction.on_commit(send)


def claim_due(code, round_id, now=None):
    current = timezone.now() if now is None else now
    with transaction.atomic():
        round_ = Round.objects.select_for_update().filter(pk=round_id).first()
        if round_ is None or round_.status != Round.Status.VOTING:
            return []
        marks = due_marks(round_, current)
        if not marks:
            return []
        events = []
        for mark in marks:
            round_.vote_mark = mark
            events.append(("round.countdown", _countdown_payload(code, round_, mark)))
        round_.save(update_fields=["vote_mark"])
        return events


def publish_due(code, round_id, now=None):
    events = claim_due(code, round_id, now)
    closing = any(
        kind == "round.countdown" and payload["mark"] == 0 for kind, payload in events
    )
    if closing:
        events.extend(_reveal_due(code, round_id, now))
    if events:
        from realtime.publish import publish_room_events

        publish_room_events(code, events)
    return events


def _reveal_due(code, round_id, now):
    round_ = Round.objects.filter(pk=round_id).first()
    if round_ is None:
        return []
    try:
        closed = close_vote(round_, now)
    except InvalidRoundState:
        return []
    if not closed.changed:
        return []
    round_.refresh_from_db()
    return [
        ("round.phase_changed", _phase_payload(code, round_)),
        (
            "round.revealed",
            {"code": code, "number": round_.number, "results": closed.results},
        ),
    ]


def arm_countdown(code, round_id):
    if "test" in sys.argv:
        return
    for delay in (1, 2, 3):
        timer = threading.Timer(delay, _timer_publish, args=(code, round_id))
        timer.daemon = True
        timer.start()


def _timer_publish(code, round_id):
    try:
        publish_due(code, round_id)
    except Exception:
        logger.exception("No se publicó la cuenta de la sala %s.", code)
    finally:
        connections.close_all()


def _countdown_payload(code, round_, mark):
    return {
        "code": code,
        "number": round_.number,
        "mark": mark,
        "opened_at": round_.vote_opened_at.isoformat(),
        "closes_at": round_.vote_closes_at.isoformat(),
    }


def _schedule_hand(code, round_id, name):
    def send():
        try:
            from realtime.publish import publish_room_events

            round_ = Round.objects.filter(pk=round_id).first()
            if round_ is None or round_.status != Round.Status.CONVERSATION:
                return
            if not round_.readies.filter(participant__name=name).exists():
                return
            publish_room_events(
                code,
                [("round.hand_raised", _hand_payload(code, round_, name))],
            )
        except Exception:
            logger.exception("No se publicaron los eventos de la sala %s.", code)

    transaction.on_commit(send)


def _hand_payload(code, round_, name):
    return {
        "code": code,
        "number": round_.number,
        "name": name,
        "ready_count": round_.readies.count(),
        "player_count": round_.game.participants.count(),
    }


def _phase_payload(code, round_):
    view = round_public_view(round_)
    return {
        "code": code,
        "number": view["number"],
        "status": view["status"],
        "dealt_count": view["dealt_count"],
        "discard_count": view["discard_count"],
    }


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
