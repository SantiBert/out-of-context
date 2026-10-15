import random
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from games.deck import InvalidRoundState, create_piles, deal_round, start_round
from games.models import Game, Participant, Round, ScoreAward, Vote
from games.scoring import (
    FIST,
    POINT,
    V,
    VoteChoice,
    close_vote,
    record_votes,
    submit_vote,
)
from games.test.test_deck import make_cards
from games.test.test_scoring import dealt_round, voting_round


class CloseVoteTests(TestCase):
    def test_a_complete_ballot_finishes_once(self):
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
        deadline = timezone.now() - timedelta(seconds=1)
        round_.vote_closes_at = deadline
        round_.save(update_fields=["vote_closes_at"])

        first = close_vote(round_, deadline)

        round_.refresh_from_db()
        self.assertTrue(first.changed)
        self.assertEqual(round_.status, Round.Status.FINISHED)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 4)
        self.assertEqual(round_.game.rounds.count(), 1)
        self.assertEqual(round_.game.status, Game.Status.PREPARING)
        by_name = {row["name"]: row for row in first.results}
        self.assertEqual(
            [row["name"] for row in first.results],
            ["Ana", "Luis", "Nora", "Otto"],
        )
        self.assertEqual(by_name["Ana"]["points"], 1)
        self.assertEqual(by_name["Ana"]["recognized_by"], ["Luis"])
        self.assertNotIn("pointed_by", by_name["Ana"])
        self.assertEqual(by_name["Luis"]["points"], 0)
        self.assertEqual(by_name["Luis"]["recognized_by"], ["Ana"])
        self.assertEqual(by_name["Nora"]["points"], 2)
        self.assertEqual(by_name["Nora"]["pointed_by"], ["Luis"])
        self.assertEqual(by_name["Nora"]["gesture"], V)
        self.assertEqual(by_name["Otto"]["points"], 1)
        self.assertEqual(by_name["Otto"]["pointed_by"], [])
        self.assertNotIn("pk", by_name["Ana"])

        with patch("games.scoring.score_votes", side_effect=AssertionError):
            second = close_vote(round_, deadline)

        self.assertFalse(second.changed)
        self.assertEqual(second.results, first.results)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 4)

    def test_an_open_ballot_does_not_finish(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        record_votes(
            round_,
            [
                VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                VoteChoice(players["Luis"], POINT, (players["Ana"],)),
                VoteChoice(players["Nora"], FIST),
            ],
        )

        with self.assertRaises(InvalidRoundState):
            close_vote(round_, timezone.now())
        future = timezone.now() + timedelta(minutes=5)
        round_.vote_closes_at = future
        round_.save(update_fields=["vote_closes_at"])
        with self.assertRaises(InvalidRoundState):
            close_vote(round_, future - timedelta(seconds=1))

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.VOTING)
        self.assertFalse(ScoreAward.objects.filter(round=round_).exists())

    def test_one_missing_vote_scores_zero_and_reveals(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        deadline = _open_for_votes(round_)
        submit_vote(round_, players["Ana"], POINT, (players["Luis"],))
        submit_vote(round_, players["Luis"], POINT, (players["Ana"],))
        round_.vote_closes_at = deadline
        round_.save(update_fields=["vote_closes_at"])

        first = close_vote(round_, deadline)

        round_.refresh_from_db()
        self.assertTrue(first.changed)
        self.assertEqual(round_.status, Round.Status.FINISHED)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 3)
        self.assertEqual(round_.votes.count(), 2)
        by_name = {row["name"]: row for row in first.results}
        self.assertEqual(by_name["Ana"]["points"], 1)
        self.assertEqual(by_name["Ana"]["gesture"], POINT)
        self.assertEqual(by_name["Luis"]["points"], 1)
        self.assertIsNone(by_name["Nora"]["gesture"])
        self.assertEqual(by_name["Nora"]["targets"], [])
        self.assertEqual(by_name["Nora"]["points"], 0)
        self.assertEqual(by_name["Nora"]["pointed_by"], [])
        self.assertFalse(
            Vote.objects.filter(round=round_, participant=players["Nora"]).exists()
        )

        with patch("games.scoring.score_votes", side_effect=AssertionError):
            second = close_vote(round_, deadline)

        self.assertFalse(second.changed)
        self.assertEqual(second.results, first.results)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 3)
        with self.assertRaises(InvalidRoundState):
            submit_vote(round_, players["Nora"], FIST, ())
        self.assertEqual(round_.votes.count(), 2)

    def test_several_missing_votes_score_zero(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1), ("Nora", 2)])
        deadline = _open_for_votes(round_)
        submit_vote(round_, players["Ana"], POINT, (players["Luis"],))
        round_.vote_closes_at = deadline
        round_.save(update_fields=["vote_closes_at"])

        closed = close_vote(round_, deadline)

        by_name = {row["name"]: row for row in closed.results}
        self.assertEqual(by_name["Ana"]["points"], 0)
        self.assertEqual(by_name["Ana"]["gesture"], POINT)
        self.assertIsNone(by_name["Luis"]["gesture"])
        self.assertEqual(by_name["Luis"]["points"], 0)
        self.assertIsNone(by_name["Nora"]["gesture"])
        self.assertEqual(by_name["Nora"]["points"], 0)
        self.assertEqual(round_.votes.count(), 1)
        self.assertEqual(ScoreAward.objects.filter(round=round_).count(), 3)

    def test_a_missing_voter_can_play_the_next_round(self):
        game = Game.objects.create()
        players = {
            name: Participant.objects.create(game=game, name=name)
            for name in ("Ana", "Luis", "Nora", "Otto")
        }
        create_piles(game, make_cards(15))
        ordered = [players[name] for name in ("Ana", "Luis", "Nora", "Otto")]
        first = deal_round(
            start_round(game, random.Random(1)),
            ordered,
            random.Random(2),
        )
        opened = timezone.now()
        first.status = Round.Status.VOTING
        first.vote_opened_at = opened
        first.vote_closes_at = opened + timedelta(minutes=5)
        first.save(update_fields=["status", "vote_opened_at", "vote_closes_at"])
        submit_vote(first, players["Ana"], FIST, ())
        first.vote_closes_at = opened
        first.save(update_fields=["vote_closes_at"])

        close_vote(first, opened)

        second = deal_round(
            start_round(game, random.Random(3)),
            ordered,
            random.Random(4),
        )
        second.status = Round.Status.VOTING
        second.vote_opened_at = timezone.now()
        second.vote_closes_at = timezone.now() + timedelta(minutes=5)
        second.save(update_fields=["status", "vote_opened_at", "vote_closes_at"])
        submit_vote(second, players["Luis"], FIST, ())

        self.assertEqual(first.votes.count(), 1)
        self.assertEqual(
            list(second.votes.values_list("participant__name", flat=True)),
            ["Luis"],
        )
        self.assertEqual(ScoreAward.objects.filter(round=first).count(), 4)
        self.assertEqual(second.number, 2)

    def test_a_conversation_does_not_finish(self):
        round_, _players = dealt_round([("Ana", 1), ("Luis", 1)])
        round_.vote_closes_at = timezone.now() - timedelta(seconds=1)
        round_.save(update_fields=["vote_closes_at"])

        with self.assertRaises(InvalidRoundState):
            close_vote(round_, round_.vote_closes_at)

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertFalse(ScoreAward.objects.filter(round=round_).exists())

    def test_a_failed_award_leaves_the_round_voting(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1)])
        record_votes(
            round_,
            [
                VoteChoice(players["Ana"], POINT, (players["Luis"],)),
                VoteChoice(players["Luis"], POINT, (players["Ana"],)),
            ],
        )
        deadline = timezone.now() - timedelta(seconds=1)
        round_.vote_closes_at = deadline
        round_.save(update_fields=["vote_closes_at"])

        with patch(
            "games.scoring.ScoreAward.objects.create",
            side_effect=RuntimeError,
        ):
            with self.assertRaises(RuntimeError):
                close_vote(round_, deadline)

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.VOTING)
        self.assertFalse(ScoreAward.objects.filter(round=round_).exists())


def _open_for_votes(round_):
    opened = timezone.now()
    round_.vote_opened_at = opened
    round_.vote_closes_at = opened + timedelta(minutes=5)
    round_.save(update_fields=["vote_opened_at", "vote_closes_at"])
    return opened
