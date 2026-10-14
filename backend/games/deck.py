import random
from dataclasses import dataclass

from django.db import transaction

from games.models import (
    COPIES_PER_CARD,
    MAX_PLAYERS,
    MIN_PLAYERS,
    CardCopy,
    DealtHand,
    DiscardedCopy,
    Game,
    GamePile,
    Round,
    RoundPile,
)

SMALL_GAME_MAX_PLAYERS = 6
SMALL_GAME_PILES = 15
SMALL_GAME_PILES_PER_ROUND = 3
SMALL_GAME_MAX_ROUNDS = 5
LARGE_GAME_PILES = 16
LARGE_GAME_PILES_PER_ROUND = 4
LARGE_GAME_MAX_ROUNDS = 4


class InvalidPlayerCount(Exception):
    pass


class InvalidPileSet(Exception):
    pass


class InsufficientPiles(Exception):
    pass


class RoundStillOpen(Exception):
    pass


class GameFinished(Exception):
    pass


@dataclass(frozen=True)
class DeckConfig:
    pile_count: int
    copies_per_pile: int
    piles_per_round: int
    max_rounds: int


def deck_config(player_count):
    if isinstance(player_count, bool) or not isinstance(player_count, int):
        raise InvalidPlayerCount("La partida admite entre 4 y 8 jugadores.")
    if player_count < MIN_PLAYERS or player_count > MAX_PLAYERS:
        raise InvalidPlayerCount("La partida admite entre 4 y 8 jugadores.")
    if player_count <= SMALL_GAME_MAX_PLAYERS:
        return DeckConfig(
            pile_count=SMALL_GAME_PILES,
            copies_per_pile=COPIES_PER_CARD,
            piles_per_round=SMALL_GAME_PILES_PER_ROUND,
            max_rounds=SMALL_GAME_MAX_ROUNDS,
        )
    return DeckConfig(
        pile_count=LARGE_GAME_PILES,
        copies_per_pile=COPIES_PER_CARD,
        piles_per_round=LARGE_GAME_PILES_PER_ROUND,
        max_rounds=LARGE_GAME_MAX_ROUNDS,
    )


def create_piles(game, cards):
    config = deck_config(game.participants.count())
    card_list = list(cards)
    if len(card_list) != config.pile_count:
        raise InvalidPileSet(
            f"Esta partida necesita {config.pile_count} pilas distintas."
        )
    if len({card.pk for card in card_list}) != len(card_list):
        raise InvalidPileSet("Las pilas deben ser cartas distintas.")
    for card in card_list:
        if card.copies.count() != config.copies_per_pile:
            raise InvalidPileSet("Cada pila tiene tres copias de la misma carta.")
    if game.piles.exists():
        raise InvalidPileSet("La partida ya tiene sus pilas.")
    piles = []
    for card in card_list:
        piles.append(GamePile.objects.create(game=game, card=card))
    return piles


def available_piles(game):
    consumed = RoundPile.objects.filter(game=game).values("card_id")
    return game.piles.exclude(card_id__in=consumed).order_by("card__number")


@transaction.atomic
def start_round(game, rng: random.Random):
    game = Game.objects.select_for_update().get(pk=game.pk)
    if game.status == Game.Status.FINISHED:
        raise GameFinished("La partida ya terminó.")
    if game.rounds.exclude(status=Round.Status.FINISHED).exists():
        raise RoundStillOpen("La ronda anterior sigue abierta.")
    config = deck_config(game.participants.count())
    if game.rounds.count() >= config.max_rounds:
        raise InsufficientPiles("No quedan pilas suficientes para otra ronda.")
    available = list(available_piles(game))
    if len(available) < config.piles_per_round:
        raise InsufficientPiles("No quedan pilas suficientes para otra ronda.")
    chosen = rng.sample(available, config.piles_per_round)
    round_ = Round.objects.create(
        game=game,
        number=game.rounds.count() + 1,
        status=Round.Status.PREPARED,
    )
    for pile in chosen:
        RoundPile.objects.create(game=game, round=round_, card=pile.card)
    return round_


class InvalidRoundState(Exception):
    pass


class InvalidParticipants(Exception):
    pass


class InsufficientCards(Exception):
    pass


def _round_copies(round_):
    return list(
        CardCopy.objects.filter(card__round_piles__round=round_).order_by(
            "card__number",
            "copy_number",
        )
    )


def _validate_participants(round_, participants):
    participant_list = list(participants)
    identities = [participant.pk for participant in participant_list]
    if len(identities) != len(set(identities)):
        raise InvalidParticipants("La lista de jugadores tiene repetidos.")
    game_ids = set(round_.game.participants.values_list("pk", flat=True))
    if set(identities) != game_ids:
        raise InvalidParticipants("Los jugadores no son los de la partida.")
    return participant_list


@transaction.atomic
def deal_round(round_, participants, rng: random.Random):
    round_ = Round.objects.select_for_update().get(pk=round_.pk)
    if round_.status != Round.Status.PREPARED:
        raise InvalidRoundState("La ronda no admite un reparto.")
    if round_.dealt_hands.exists() or round_.discards.exists():
        raise InvalidRoundState("La ronda ya fue repartida.")
    participant_list = _validate_participants(round_, participants)
    copies = _round_copies(round_)
    if len(copies) < len(participant_list):
        raise InsufficientCards("No hay cartas suficientes para repartir.")
    rng.shuffle(copies)
    dealt = copies[: len(participant_list)]
    for participant, card_copy in zip(participant_list, dealt, strict=True):
        DealtHand.objects.create(
            round=round_,
            participant=participant,
            card_copy=card_copy,
        )
    for card_copy in copies[len(participant_list) :]:
        DiscardedCopy.objects.create(round=round_, card_copy=card_copy)
    round_.status = Round.Status.CONVERSATION
    round_.save()
    return round_


@transaction.atomic
def prepare_round(game, participants, rng: random.Random):
    round_ = start_round(game, rng)
    return deal_round(round_, participants, rng)


def round_public_view(round_):
    participant_ids = list(
        round_.game.participants.order_by("pk").values_list("pk", flat=True)
    )
    return {
        "number": round_.number,
        "status": round_.status,
        "participant_ids": participant_ids,
        "dealt_count": round_.dealt_hands.count(),
        "discard_count": round_.discards.count(),
    }


def private_hand(round_, participant):
    return round_.dealt_hands.get(participant=participant).card_copy
