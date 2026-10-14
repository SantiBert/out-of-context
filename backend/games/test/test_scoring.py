from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase

from games.deck import InvalidRoundState
from games.models import (
    CardCopy,
    DealtHand,
    Game,
    Participant,
    Round,
    RoundPile,
    ScoreAward,
    SituationCard,
    Vote,
    VoteTarget,
)
from games.roles import Classification, Impostor, Team
from games.scoring import (
    FIST,
    POINT,
    InvalidVote,
    PlayerScore,
    V,
    VoteChoice,
    apply_round_scores,
    record_votes,
    score_votes,
    total_points,
)


def team_of(*players, situation=1):
    return Classification((Team(situation, tuple(sorted(players))),), ())


def with_impostors(teams, impostors):
    return Classification(
        tuple(teams),
        tuple(Impostor(situation, player) for situation, player in impostors),
    )


class TeamScoreTests(SimpleTestCase):
    def test_a_correct_player_scores_one_per_teammate_who_pointed(self):
        classification = team_of("A", "B", "C")
        votes = [
            VoteChoice("A", POINT, ("B", "C")),
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("C", POINT, ("B",)),
        ]

        scores = dict(score_votes(classification, votes))

        self.assertEqual(scores["A"], 1)
        self.assertEqual(scores["B"], 0)
        self.assertEqual(scores["C"], 0)

    def test_an_incomplete_point_still_counts_for_the_teammate(self):
        classification = team_of("A", "B", "C")
        votes = [
            VoteChoice("A", POINT, ("B", "C")),
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("C", POINT, ("A", "B")),
        ]

        scores = dict(score_votes(classification, votes))

        self.assertEqual(scores["A"], 2)
        self.assertEqual(scores["C"], 1)

    def test_mutual_recognition_in_a_pair_scores_one_each(self):
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", POINT, ("A",)),
        ]

        self.assertEqual(
            score_votes(team_of("A", "B"), votes),
            (PlayerScore("A", 1), PlayerScore("B", 1)),
        )

    def test_a_correct_player_scores_zero_when_nobody_points_back(self):
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", FIST),
        ]

        scores = dict(score_votes(team_of("A", "B"), votes))

        self.assertEqual(scores["A"], 0)
        self.assertEqual(scores["B"], 0)

    def test_an_incomplete_identification_scores_zero(self):
        classification = team_of("A", "B", "C")
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", POINT, ("A", "C")),
            VoteChoice("C", POINT, ("A", "B")),
        ]

        self.assertEqual(dict(score_votes(classification, votes))["A"], 0)

    def test_pointing_outside_the_team_scores_zero(self):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "X"),))
        votes = [
            VoteChoice("A", POINT, ("B", "X")),
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("X", FIST),
        ]

        scores = dict(score_votes(classification, votes))

        self.assertEqual(scores["A"], 0)
        self.assertEqual(scores["B"], 1)


class ImpostorScoreTests(SimpleTestCase):
    def _round(self, impostor_gesture, pointers):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "I"),))
        votes = [
            VoteChoice("A", POINT, ("B", "I") if "A" in pointers else ("B",)),
            VoteChoice("B", POINT, ("A", "I") if "B" in pointers else ("A",)),
            VoteChoice("I", impostor_gesture),
        ]
        return dict(score_votes(classification, votes))

    def test_a_real_impostor_scores_one_for_a_fist(self):
        scores = self._round(FIST, {"A", "B"})

        self.assertEqual(scores["I"], 1)

    def test_a_risky_impostor_scores_one_plus_each_pointer(self):
        self.assertEqual(self._round(V, {"A"})["I"], 2)
        self.assertEqual(self._round(V, {"A", "B"})["I"], 3)

    def test_a_risky_impostor_scores_zero_without_pointers(self):
        self.assertEqual(self._round(V, set())["I"], 0)

    def test_a_team_player_scores_zero_with_an_impostor_gesture(self):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "I"),))
        for gesture in (FIST, V):
            votes = [
                VoteChoice("A", gesture),
                VoteChoice("B", POINT, ("A",)),
                VoteChoice("I", FIST),
            ]

            self.assertEqual(dict(score_votes(classification, votes))["A"], 0)

    def test_an_impostor_who_points_scores_zero(self):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "I"),))
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("I", POINT, ("A",)),
        ]

        self.assertEqual(dict(score_votes(classification, votes))["I"], 0)


class InvalidVoteTests(SimpleTestCase):
    def test_a_player_cannot_point_at_themselves(self):
        votes = [
            VoteChoice("A", POINT, ("A", "B")),
            VoteChoice("B", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_an_unknown_gesture_is_rejected(self):
        votes = [
            VoteChoice("A", "wave", ()),
            VoteChoice("B", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_a_player_outside_the_round_is_rejected(self):
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("Z", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_a_duplicated_vote_is_rejected(self):
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("A", FIST),
            VoteChoice("B", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_a_missing_vote_is_rejected(self):
        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), [VoteChoice("A", POINT, ("B",))])

    def test_repeated_targets_are_rejected(self):
        votes = [
            VoteChoice("A", POINT, ("B", "B")),
            VoteChoice("B", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_a_point_without_targets_is_rejected(self):
        votes = [
            VoteChoice("A", POINT, ()),
            VoteChoice("B", POINT, ("A",)),
        ]

        with self.assertRaises(InvalidVote):
            score_votes(team_of("A", "B"), votes)

    def test_a_fist_or_v_cannot_point(self):
        for gesture in (FIST, V):
            votes = [
                VoteChoice("A", gesture, ("B",)),
                VoteChoice("B", POINT, ("A",)),
            ]

            with self.assertRaises(InvalidVote):
                score_votes(team_of("A", "B"), votes)

    def test_the_same_votes_and_roles_produce_the_same_scores(self):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "I"),))
        first = [
            VoteChoice("I", V),
            VoteChoice("A", POINT, ("B", "I")),
            VoteChoice("B", POINT, ("A",)),
        ]
        second = [
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("A", POINT, ("I", "B")),
            VoteChoice("I", V),
        ]

        self.assertEqual(
            score_votes(classification, first),
            score_votes(classification, second),
        )


def dealt_round(assignments):
    game = Game.objects.create()
    round_ = Round.objects.create(
        game=game,
        number=1,
        status=Round.Status.CONVERSATION,
    )
    copies = {}
    players = {}
    for name, card_number in assignments:
        participant = Participant.objects.create(game=game, name=name)
        players[name] = participant
        if card_number not in copies:
            card = SituationCard.objects.create(
                number=card_number,
                text=f"Situación {card_number}.",
            )
            copies[card_number] = [
                CardCopy.objects.create(card=card, copy_number=index)
                for index in (1, 2, 3)
            ]
            RoundPile.objects.create(game=game, round=round_, card=card)
        DealtHand.objects.create(
            round=round_,
            participant=participant,
            card_copy=copies[card_number].pop(0),
        )
    return round_, players


def voting_round(assignments):
    round_, players = dealt_round(assignments)
    round_.status = Round.Status.VOTING
    round_.save(update_fields=["status"])
    return round_, players


class PersistScoreTests(TestCase):
    def test_applying_a_round_twice_does_not_duplicate_points(self):
        round_, players = voting_round(
            [("Ana", 1), ("Luis", 1), ("Nora", 2), ("Otto", 3)]
        )
        record_votes(
            round_,
            [
                VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                VoteChoice(players["Luis"], POINT, (players["Ana"], players["Nora"])),
                VoteChoice(players["Nora"], V),
                VoteChoice(players["Otto"], FIST),
            ],
        )

        first = apply_round_scores(round_)
        award_count = ScoreAward.objects.filter(round=round_).count()
        totals = {player.pk: total_points(player) for player in players.values()}

        second = apply_round_scores(round_)

        round_.refresh_from_db()
        self.assertEqual(second, first)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), award_count)
        self.assertEqual(
            {player.pk: total_points(player) for player in players.values()},
            totals,
        )
        self.assertEqual(round_.status, Round.Status.VOTING)
        self.assertEqual(dict(first)[players["Ana"].pk], 1)
        self.assertEqual(dict(first)[players["Luis"].pk], 0)
        self.assertEqual(dict(first)[players["Nora"].pk], 2)
        self.assertEqual(dict(first)[players["Otto"].pk], 1)

    def test_recording_the_same_votes_twice_does_not_add_rows(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        votes = [
            VoteChoice(players["Ana"], POINT, (players["Luis"],)),
            VoteChoice(players["Luis"], POINT, (players["Ana"],)),
            VoteChoice(players["Nora"], FIST),
        ]

        record_votes(round_, votes)
        record_votes(round_, list(reversed(votes)))

        self.assertEqual(round_.votes.count(), 3)

    def test_a_different_ballot_is_rejected(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        record_votes(
            round_,
            [
                VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                VoteChoice(players["Luis"], POINT, (players["Ana"],)),
                VoteChoice(players["Nora"], FIST),
            ],
        )

        with self.assertRaises(InvalidVote):
            record_votes(
                round_,
                [
                    VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                    VoteChoice(players["Luis"], FIST),
                    VoteChoice(players["Nora"], V),
                ],
            )

        self.assertEqual(round_.votes.count(), 3)
        self.assertFalse(ScoreAward.objects.filter(round=round_).exists())

    def test_a_ballot_outside_voting_is_rejected(self):
        round_, players = dealt_round([("Ana", 1), ("Luis", 1)])
        votes = [
            VoteChoice(players["Ana"], POINT, (players["Luis"],)),
            VoteChoice(players["Luis"], POINT, (players["Ana"],)),
        ]
        for status in (
            Round.Status.PREPARED,
            Round.Status.CONVERSATION,
            Round.Status.FINISHED,
        ):
            with self.subTest(status=status):
                round_.status = status
                round_.save(update_fields=["status"])

                with self.assertRaises(InvalidRoundState):
                    record_votes(round_, votes)

                self.assertEqual(round_.votes.count(), 0)
                round_.refresh_from_db()
                self.assertEqual(round_.status, status)

    def test_a_self_target_is_rejected_by_the_model(self):
        round_, players = dealt_round([("Ana", 1), ("Luis", 1)])
        vote = Vote.objects.create(
            round=round_,
            participant=players["Ana"],
            gesture=POINT,
        )

        with self.assertRaises(ValidationError):
            VoteTarget.objects.create(vote=vote, participant=players["Ana"])

    def test_a_player_from_another_game_is_rejected(self):
        round_, _players = dealt_round([("Ana", 1), ("Luis", 1)])
        other = Participant.objects.create(game=Game.objects.create(), name="Zoe")

        with self.assertRaises(ValidationError):
            Vote.objects.create(round=round_, participant=other, gesture=FIST)
