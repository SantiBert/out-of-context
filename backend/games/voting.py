from datetime import timedelta

from django.utils import timezone

STEP = timedelta(seconds=1)
CLOSE_AFTER = STEP * 3
MARKS = (3, 2, 1, 0)


def open_vote_window(round_, now=None):
    if round_.vote_opened_at is not None:
        return round_
    opened = now or timezone.now()
    round_.vote_opened_at = opened
    round_.vote_closes_at = opened + CLOSE_AFTER
    return round_


def countdown_mark(round_, now=None):
    if round_.vote_opened_at is None:
        return None
    current = now or timezone.now()
    elapsed = (current - round_.vote_opened_at).total_seconds()
    if elapsed < 0:
        return MARKS[0]
    index = min(len(MARKS) - 1, int(elapsed // STEP.total_seconds()))
    return MARKS[index]


def vote_is_closed(round_, now=None):
    if round_.vote_closes_at is None:
        return False
    current = now or timezone.now()
    return current >= round_.vote_closes_at


def due_marks(round_, now=None):
    mark = countdown_mark(round_, now)
    if mark is None:
        return ()
    start = MARKS[0] if round_.vote_mark is None else round_.vote_mark - 1
    if start < mark:
        return ()
    return tuple(range(start, mark - 1, -1))
