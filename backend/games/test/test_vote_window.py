from datetime import timedelta

from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from games.deck import InvalidRoundState
from games.models import Round
from games.rounds import NotReadyToClose, declare_conversation_end, mark_ready
from games.scoring import FIST, POINT, VoteChoice, record_votes
from games.test.test_rounds import conversation
from games.test.test_scoring import voting_round
from games.voting import CLOSE_AFTER, countdown_mark, due_marks


class MarkTests(SimpleTestCase):
    def test_marks_follow_the_server_clock(self):
        opened = timezone.now()
        round_ = Round(
            vote_opened_at=opened,
            vote_closes_at=opened + CLOSE_AFTER,
        )

        self.assertEqual(countdown_mark(round_, opened), 3)
        self.assertEqual(countdown_mark(round_, opened + timedelta(seconds=1)), 2)
        self.assertEqual(countdown_mark(round_, opened + timedelta(seconds=2)), 1)
        self.assertEqual(countdown_mark(round_, opened + CLOSE_AFTER), 0)
        self.assertEqual(due_marks(round_, opened), (3,))

        round_.vote_mark = 3
        self.assertEqual(due_marks(round_, opened), ())
        self.assertEqual(due_marks(round_, opened + CLOSE_AFTER), (2, 1, 0))


class VoteWindowTests(TestCase):
    def test_closing_conversation_opens_the_window_once(self):
        round_, participants = conversation(4)
        for participant in participants[:3]:
            mark_ready(round_, participant)

        closed = declare_conversation_end(round_, participants[3])
        again = declare_conversation_end(round_, participants[0])

        self.assertEqual(closed.status, Round.Status.VOTING)
        self.assertEqual(closed.vote_closes_at - closed.vote_opened_at, CLOSE_AFTER)
        self.assertIsNone(closed.vote_mark)
        self.assertEqual(again.vote_opened_at, closed.vote_opened_at)
        self.assertEqual(again.vote_closes_at, closed.vote_closes_at)
        self.assertEqual(closed.votes.count(), 0)

    def test_a_round_that_stays_in_conversation_has_no_window(self):
        round_, participants = conversation(4)
        mark_ready(round_, participants[0])

        with self.assertRaises(NotReadyToClose):
            declare_conversation_end(round_, participants[3])

        round_.refresh_from_db()
        self.assertEqual(round_.status, Round.Status.CONVERSATION)
        self.assertIsNone(round_.vote_opened_at)
        self.assertIsNone(round_.vote_closes_at)

    def test_a_late_ballot_is_rejected(self):
        round_, players = voting_round([("Ana", 1), ("Luis", 1)])
        closed_at = timezone.now() - timedelta(seconds=1)
        round_.vote_opened_at = closed_at - CLOSE_AFTER
        round_.vote_closes_at = closed_at
        round_.save(update_fields=["vote_opened_at", "vote_closes_at"])
        votes = [
            VoteChoice(players["Ana"], POINT, (players["Luis"],)),
            VoteChoice(players["Luis"], FIST),
        ]

        with self.assertRaises(InvalidRoundState):
            record_votes(round_, votes)

        self.assertEqual(round_.votes.count(), 0)
        self.assertEqual(round_.status, Round.Status.VOTING)
