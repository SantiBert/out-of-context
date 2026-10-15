from django.test import SimpleTestCase, TestCase

from games.models import ScoreAward, Vote
from games.roles import Team
from games.scoring import (
    FIST,
    POINT,
    NotATeammate,
    V,
    VoteChoice,
    evaluate_team_choice,
    record_votes,
)
from games.test.test_scoring import team_of, voting_round, with_impostors


class TeamEvaluationTests(SimpleTestCase):
    def test_a_pair_recognizes_each_other(self):
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", POINT, ("A",)),
        ]

        evaluation = evaluate_team_choice(team_of("A", "B"), votes, "A")

        self.assertTrue(evaluation.correct)
        self.assertEqual(evaluation.teammates, ("B",))
        self.assertEqual(evaluation.recognized_by, ("B",))

    def test_a_trio_keeps_partial_recognition(self):
        classification = team_of("A", "B", "C")
        votes = [
            VoteChoice("A", POINT, ("B", "C")),
            VoteChoice("B", POINT, ("A",)),
            VoteChoice("C", POINT, ("B",)),
        ]

        evaluation = evaluate_team_choice(classification, votes, "A")

        self.assertTrue(evaluation.correct)
        self.assertEqual(evaluation.teammates, ("B", "C"))
        self.assertEqual(evaluation.recognized_by, ("B",))

    def test_an_incomplete_list_is_not_correct(self):
        classification = team_of("A", "B", "C")
        votes = [
            VoteChoice("A", POINT, ("B",)),
            VoteChoice("B", POINT, ("A", "C")),
            VoteChoice("C", POINT, ("A", "B")),
        ]

        evaluation = evaluate_team_choice(classification, votes, "A")

        self.assertFalse(evaluation.correct)
        self.assertEqual(evaluation.recognized_by, ("B", "C"))

    def test_an_outsider_or_a_fist_is_not_correct(self):
        classification = with_impostors(
            (Team(1, ("A", "B")),),
            ((2, "X"), (3, "Y")),
        )
        pointed = evaluate_team_choice(
            classification,
            [
                VoteChoice("A", POINT, ("B", "X")),
                VoteChoice("B", POINT, ("A", "Y")),
                VoteChoice("X", POINT, ("A",)),
                VoteChoice("Y", FIST),
            ],
            "A",
        )
        fist = evaluate_team_choice(
            classification,
            [
                VoteChoice("A", V),
                VoteChoice("B", POINT, ("A", "X")),
            ],
            "A",
        )

        self.assertFalse(pointed.correct)
        self.assertEqual(pointed.recognized_by, ("B",))
        self.assertFalse(fist.correct)
        self.assertEqual(fist.recognized_by, ("B",))

    def test_another_team_is_outside_and_does_not_count(self):
        classification = with_impostors(
            (Team(1, ("A", "B")), Team(2, ("C", "D"))),
            ((3, "X"),),
        )
        votes = [
            VoteChoice("A", POINT, ("B", "C")),
            VoteChoice("C", POINT, ("A", "D")),
            VoteChoice("B", POINT, ("A",)),
        ]

        evaluation = evaluate_team_choice(classification, votes, "A")

        self.assertFalse(evaluation.correct)
        self.assertEqual(evaluation.teammates, ("B",))
        self.assertEqual(evaluation.recognized_by, ("B",))

    def test_a_missing_choice_does_not_point(self):
        evaluation = evaluate_team_choice(
            team_of("A", "B", "C"),
            [VoteChoice("A", POINT, ("B", "C"))],
            "A",
        )

        self.assertTrue(evaluation.correct)
        self.assertEqual(evaluation.recognized_by, ())

    def test_an_impostor_is_not_a_team(self):
        classification = with_impostors((Team(1, ("A", "B")),), ((2, "I"),))

        with self.assertRaises(NotATeammate):
            evaluate_team_choice(
                classification,
                [VoteChoice("I", FIST)],
                "I",
            )
        with self.assertRaises(NotATeammate):
            evaluate_team_choice(classification, [], "Z")


class StoredChoiceTests(TestCase):
    def test_evaluation_does_not_change_stored_votes(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        record_votes(
            round_,
            [
                VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                VoteChoice(players["Luis"], POINT, (players["Ana"],)),
                VoteChoice(players["Nora"], FIST),
            ],
        )
        before = list(
            Vote.objects.filter(round=round_).values_list(
                "participant_id",
                "gesture",
            )
        )

        evaluation = evaluate_team_choice(
            team_of(players["Ana"].pk, players["Luis"].pk),
            [
                VoteChoice(players["Ana"].pk, POINT, (players["Luis"].pk,)),
                VoteChoice(players["Luis"].pk, POINT, (players["Ana"].pk,)),
                VoteChoice(players["Nora"].pk, FIST),
            ],
            players["Ana"].pk,
        )

        self.assertTrue(evaluation.correct)
        self.assertEqual(evaluation.recognized_by, (players["Luis"].pk,))
        self.assertEqual(
            list(
                Vote.objects.filter(round=round_).values_list(
                    "participant_id",
                    "gesture",
                )
            ),
            before,
        )
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 0)
