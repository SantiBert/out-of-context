from typing import NamedTuple


class RoomState(NamedTuple):
    code: str
    status: str
    host: str
    participants: tuple[str, ...]
    player_count: int
    accepting_members: bool
    can_start: bool
