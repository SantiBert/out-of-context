from dataclasses import dataclass
from typing import NamedTuple

from django.db import IntegrityError, transaction
from django.db.models import Sum

from games.models import Round, ScoreAward, Vote, VoteTarget
from games.roles import classify_round

FIST = "fist"
V = "v"
POINT = "point"
GESTURES = frozenset({FIST, V, POINT})


class InvalidVote(Exception):
    pass


@dataclass(frozen=True)
class VoteChoice:
    player: object
    gesture: str
    targets: tuple = ()


class PlayerScore(NamedTuple):
    player: object
    points: int


def score_votes(classification, votes):
    by_player = _validated_votes(_classification_players(classification), votes)
    pointed_at = {player: set() for player in by_player}
    for voter, choice in by_player.items():
        if choice.gesture != POINT:
            continue
        for target in choice.targets:
            pointed_at[target].add(voter)

    teams = {}
    for team in classification.teams:
        for player in team.players:
            teams[player] = frozenset(team.players) - {player}
    impostors = {impostor.player for impostor in classification.impostors}

    scores = []
    for player in sorted(by_player):
        choice = by_player[player]
        if player in impostors:
            points = _impostor_points(choice, len(pointed_at[player]))
        elif choice.gesture == POINT and set(choice.targets) == teams[player]:
            points = len(teams[player] & pointed_at[player])
        else:
            points = 0
        scores.append(PlayerScore(player, points))
    return tuple(scores)


def record_votes(round_, votes):
    normalized = tuple(_identified(vote) for vote in votes)
    with transaction.atomic():
        Round.objects.select_for_update().get(pk=round_.pk)
        participants = set(round_.game.participants.values_list("pk", flat=True))
        _validated_votes(participants, normalized)
        stored = _votes_for_round(round_)
        if stored:
            if _signature(stored) == _signature(normalized):
                return stored
            raise InvalidVote("La ronda ya tiene votos distintos.")
        for choice in normalized:
            record = Vote.objects.create(
                round=round_,
                participant_id=choice.player,
                gesture=choice.gesture,
            )
            for target in choice.targets:
                VoteTarget.objects.create(vote=record, participant_id=target)
        return _votes_for_round(round_)


def apply_round_scores(round_):
    with transaction.atomic():
        Round.objects.select_for_update().get(pk=round_.pk)
        existing = ScoreAward.objects.filter(round=round_).order_by("participant_id")
        if existing.exists():
            return tuple(
                PlayerScore(award.participant_id, award.points) for award in existing
            )
        scores = score_votes(classify_round(round_), _votes_for_round(round_))
        try:
            with transaction.atomic():
                for score in scores:
                    ScoreAward.objects.create(
                        round=round_,
                        participant_id=score.player,
                        points=score.points,
                    )
        except IntegrityError:
            existing = ScoreAward.objects.filter(round=round_).order_by(
                "participant_id"
            )
            return tuple(
                PlayerScore(award.participant_id, award.points) for award in existing
            )
        return scores


def total_points(participant):
    total = participant.score_awards.aggregate(total=Sum("points"))["total"]
    return total or 0


def _impostor_points(choice, received):
    if choice.gesture == FIST:
        return 1
    if choice.gesture == V and received:
        return 1 + received
    return 0


def _classification_players(classification):
    players = set()
    for team in classification.teams:
        players.update(team.players)
    for impostor in classification.impostors:
        players.add(impostor.player)
    return players


def _validated_votes(players, votes):
    by_player = {}
    for vote in votes:
        if vote.gesture not in GESTURES:
            raise InvalidVote("El gesto no está permitido.")
        if vote.player not in players:
            raise InvalidVote("El jugador no pertenece a la ronda.")
        if vote.player in by_player:
            raise InvalidVote("Un jugador no puede votar dos veces.")
        targets = tuple(vote.targets)
        if len(targets) != len(set(targets)):
            raise InvalidVote("El señalamiento no admite objetivos repetidos.")
        for target in targets:
            if target == vote.player:
                raise InvalidVote("Un jugador no puede señalarse a sí mismo.")
            if target not in players:
                raise InvalidVote("El objetivo no pertenece a la ronda.")
        if vote.gesture == POINT and not targets:
            raise InvalidVote("El gesto de señalar exige al menos un jugador.")
        if vote.gesture in (FIST, V) and targets:
            raise InvalidVote("El puño y la V no señalan jugadores.")
        by_player[vote.player] = VoteChoice(vote.player, vote.gesture, targets)
    if set(by_player) != players:
        raise InvalidVote("Falta el voto de un jugador.")
    return by_player


def _identified(vote):
    return VoteChoice(
        _identity(vote.player),
        vote.gesture,
        tuple(_identity(target) for target in vote.targets),
    )


def _identity(value):
    if isinstance(value, int):
        return value
    identifier = getattr(value, "pk", None)
    if identifier is None:
        return value
    return identifier


def _votes_for_round(round_):
    records = round_.votes.prefetch_related("targets").order_by("participant_id")
    choices = []
    for record in records:
        targets = tuple(
            record.targets.order_by("participant_id").values_list(
                "participant_id",
                flat=True,
            )
        )
        choices.append(VoteChoice(record.participant_id, record.gesture, targets))
    return tuple(choices)


def _signature(votes):
    return frozenset(
        (vote.player, vote.gesture, tuple(sorted(vote.targets))) for vote in votes
    )
