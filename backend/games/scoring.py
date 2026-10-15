from dataclasses import dataclass
from typing import NamedTuple

from django.db import IntegrityError, transaction
from django.db.models import Sum

from games.deck import InvalidRoundState
from games.models import Round, ScoreAward, Vote, VoteTarget
from games.roles import classify_round
from games.voting import vote_is_closed

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


class NotATeammate(Exception):
    pass


class CloseResult(NamedTuple):
    results: tuple
    changed: bool


@dataclass(frozen=True)
class TeamEvaluation:
    player: object
    correct: bool
    teammates: tuple
    recognized_by: tuple


def evaluate_team_choice(classification, votes, player):
    teammates = _teammates_of(classification, player)
    if teammates is None:
        raise NotATeammate("Ese jugador no pertenece a un equipo.")
    by_player = {vote.player: vote for vote in votes}
    choice = by_player.get(player)
    correct = (
        choice is not None
        and choice.gesture == POINT
        and set(choice.targets) == set(teammates)
    )
    recognized_by = tuple(
        sorted(
            teammate
            for teammate in teammates
            if _points_at(by_player.get(teammate), player)
        )
    )
    return TeamEvaluation(
        player,
        correct,
        tuple(sorted(teammates)),
        recognized_by,
    )


def score_votes(classification, votes):
    players = _classification_players(classification)
    by_player = _validated_votes(players, votes, complete=False)
    pointed_at = {player: set() for player in players}
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
    for player in sorted(players):
        choice = by_player.get(player)
        if choice is None:
            points = 0
        elif player in impostors:
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
        locked = Round.objects.select_for_update().get(pk=round_.pk)
        if locked.status != Round.Status.VOTING:
            raise InvalidRoundState("La ronda no admite votos.")
        if vote_is_closed(locked):
            raise InvalidRoundState("La votación ya cerró.")
        participants = set(locked.game.participants.values_list("pk", flat=True))
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


def submit_vote(round_, player, gesture, targets):
    choice = _identified(VoteChoice(player, gesture, tuple(targets)))
    with transaction.atomic():
        locked = Round.objects.select_for_update().get(pk=round_.pk)
        if locked.status != Round.Status.VOTING or locked.vote_closes_at is None:
            raise InvalidRoundState("La ronda no admite votos.")
        if vote_is_closed(locked):
            raise InvalidRoundState("La votación ya cerró.")
        participants = set(locked.game.participants.values_list("pk", flat=True))
        choice = _validate_choice(participants, choice)
        existing = locked.votes.filter(participant_id=choice.player).first()
        if existing is not None:
            stored = _choice_from(existing)
            if _signature((stored,)) == _signature((choice,)):
                return stored
            raise InvalidVote("La ronda ya tiene votos distintos.")
        try:
            with transaction.atomic():
                record = Vote.objects.create(
                    round=locked,
                    participant_id=choice.player,
                    gesture=choice.gesture,
                )
                for target in choice.targets:
                    VoteTarget.objects.create(vote=record, participant_id=target)
        except IntegrityError:
            existing = locked.votes.get(participant_id=choice.player)
            stored = _choice_from(existing)
            if _signature((stored,)) == _signature((choice,)):
                return stored
            raise InvalidVote("La ronda ya tiene votos distintos.") from None
        return choice


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


def close_vote(round_, now=None):
    with transaction.atomic():
        locked = Round.objects.select_for_update().get(pk=round_.pk)
        if locked.status == Round.Status.FINISHED:
            return CloseResult(reveal_results(locked), False)
        if locked.status != Round.Status.VOTING or not vote_is_closed(locked, now):
            raise InvalidRoundState("La votación no puede cerrarse.")
        apply_round_scores(locked)
        locked.status = Round.Status.FINISHED
        locked.save(update_fields=["status"])
        return CloseResult(reveal_results(locked), True)


def reveal_results(round_):
    classification = classify_round(round_)
    votes = _votes_for_round(round_)
    awards = {
        award.participant_id: award.points
        for award in ScoreAward.objects.filter(round=round_)
    }
    names = dict(round_.game.participants.values_list("pk", "name"))
    cards = {
        hand.participant_id: {
            "number": hand.card_copy.card.number,
            "text": hand.card_copy.card.text,
        }
        for hand in round_.dealt_hands.select_related("card_copy__card")
    }
    by_player = {vote.player: vote for vote in votes}
    impostors = {impostor.player for impostor in classification.impostors}
    rows = []
    for player in sorted(names, key=names.get):
        choice = by_player.get(player)
        row = {
            "name": names[player],
            "card": cards[player],
            "gesture": None if choice is None else choice.gesture,
            "targets": []
            if choice is None
            else sorted(names[target] for target in choice.targets),
            "points": awards[player],
        }
        if player in impostors:
            row["pointed_by"] = sorted(
                names[other]
                for other, other_choice in by_player.items()
                if _points_at(other_choice, player)
            )
        else:
            evaluation = evaluate_team_choice(classification, votes, player)
            row["recognized_by"] = sorted(
                names[teammate] for teammate in evaluation.recognized_by
            )
        rows.append(row)
    return rows


def _impostor_points(choice, received):
    if choice.gesture == FIST:
        return 1
    if choice.gesture == V and received:
        return 1 + received
    return 0


def _teammates_of(classification, player):
    for team in classification.teams:
        if player in team.players:
            return frozenset(team.players) - {player}
    return None


def _points_at(choice, player):
    return choice is not None and choice.gesture == POINT and player in choice.targets


def _classification_players(classification):
    players = set()
    for team in classification.teams:
        players.update(team.players)
    for impostor in classification.impostors:
        players.add(impostor.player)
    return players


def _validated_votes(players, votes, *, complete=True):
    by_player = {}
    for vote in votes:
        if vote.player in by_player:
            raise InvalidVote("Un jugador no puede votar dos veces.")
        by_player[vote.player] = _validate_choice(players, vote)
    if complete and set(by_player) != players:
        raise InvalidVote("Falta el voto de un jugador.")
    return by_player


def _validate_choice(players, vote):
    if vote.gesture not in GESTURES:
        raise InvalidVote("El gesto no está permitido.")
    if vote.player not in players:
        raise InvalidVote("El jugador no pertenece a la ronda.")
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
    return VoteChoice(vote.player, vote.gesture, targets)


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
    return tuple(_choice_from(record) for record in records)


def _choice_from(record):
    targets = tuple(
        record.targets.order_by("participant_id").values_list(
            "participant_id",
            flat=True,
        )
    )
    return VoteChoice(record.participant_id, record.gesture, targets)


def _signature(votes):
    return frozenset(
        (vote.player, vote.gesture, tuple(sorted(vote.targets))) for vote in votes
    )
