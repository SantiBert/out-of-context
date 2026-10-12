from dataclasses import dataclass

from games.models import Round


class InvalidClassification(Exception):
    pass


@dataclass(frozen=True)
class Team:
    situation: object
    players: tuple


@dataclass(frozen=True)
class Impostor:
    situation: object
    player: object


@dataclass(frozen=True)
class Classification:
    teams: tuple
    impostors: tuple


def classify_hands(assignments):
    grouped = {}
    seen = set()
    for player, situation in assignments:
        if player in seen:
            raise InvalidClassification("Un jugador no puede clasificarse dos veces.")
        seen.add(player)
        grouped.setdefault(situation, []).append(player)

    teams = []
    impostors = []
    for situation, players in grouped.items():
        ordered = tuple(sorted(players))
        if len(ordered) == 1:
            impostors.append(Impostor(situation, ordered[0]))
        elif len(ordered) in (2, 3):
            teams.append(Team(situation, ordered))
        else:
            raise InvalidClassification(
                "Una situación repartida debe aparecer una, dos o tres veces."
            )
    teams.sort(key=lambda team: team.situation)
    impostors.sort(key=lambda impostor: (impostor.situation, impostor.player))
    return Classification(tuple(teams), tuple(impostors))


def classify_round(round_):
    if round_.status == Round.Status.PREPARED:
        raise InvalidClassification("La ronda todavía no fue repartida.")
    hands = round_.dealt_hands.select_related("card_copy")
    dealt_ids = set(hands.values_list("participant_id", flat=True))
    game_ids = set(round_.game.participants.values_list("pk", flat=True))
    if dealt_ids != game_ids:
        raise InvalidClassification("Falta la mano de un jugador.")
    assignments = hands.values_list("participant_id", "card_copy__card_id")
    return classify_hands(assignments)
