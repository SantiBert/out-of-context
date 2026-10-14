from django.db import transaction

from games.deck import InvalidRoundState
from games.models import Round, RoundReady
from games.voting import open_vote_window


class NotInGame(Exception):
    pass


class NotReadyToClose(Exception):
    pass


def majority_ready(ready_count, player_count):
    return ready_count * 2 > player_count


@transaction.atomic
def mark_ready(round_, participant):
    round_ = Round.objects.select_for_update().get(pk=round_.pk)
    if round_.status != Round.Status.CONVERSATION:
        raise InvalidRoundState("La ronda no admite quedar listo.")
    _require_participant(round_, participant)
    ready, _created = RoundReady.objects.get_or_create(
        round=round_,
        participant=participant,
    )
    return ready


@transaction.atomic
def declare_conversation_end(round_, participant):
    round_ = Round.objects.select_for_update().get(pk=round_.pk)
    _require_participant(round_, participant)
    if round_.status == Round.Status.VOTING:
        return round_
    if round_.status != Round.Status.CONVERSATION:
        raise InvalidRoundState("La ronda no admite cerrar la conversación.")
    player_count = round_.game.participants.count()
    ready_count = round_.readies.count()
    if not majority_ready(ready_count, player_count):
        raise NotReadyToClose("Todavía no hay mayoría para cerrar la conversación.")
    round_.status = Round.Status.VOTING
    open_vote_window(round_)
    round_.save(update_fields=["status", "vote_opened_at", "vote_closes_at"])
    return round_


def _require_participant(round_, participant):
    if participant.game_id != round_.game_id:
        raise NotInGame("Ese jugador no está en la partida.")
