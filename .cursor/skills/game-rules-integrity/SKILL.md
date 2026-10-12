---
name: game-rules-integrity
description: Preserve the approved Out Of Context game rules when documenting, implementing, testing, or reviewing role assignment, rounds, voting, and scoring.
paths:
  - "backend/**/*.py"
  - "apps/mobile/**/*.dart"
  - "contracts/**"
  - "docs/GAME_DESIGN_DOCUMENT.md"
---

# Game Rules Integrity

## Authority
Use `docs/GAME_DESIGN_DOCUMENT.md` as the functional source of truth only after the user has approved the document and OOC-001.6 is marked done. If approval is not evident, treat the document as a draft and do not make irreversible assumptions.

If code and the approved GDD disagree, do not silently choose one. Explain the discrepancy and propose the smallest correction.

## Rules to preserve
- A round uses 3 piles for 4–6 players and 4 piles for 7–8 players.
- Each pile has 3 identical copies of one card.
- A player is on a team if at least one other player received the same card; the team size can be two or three.
- A player is an impostor if their dealt card is unique among the players' dealt cards.
- Only dealt cards determine roles. Undealt/discarded cards do not count.
- Players may not reveal their card number or exact text during conversation.
- A round can end only after more than half the players have indicated readiness and someone declares the conversation over.
- Every player must vote; abstention is not allowed.
- Team members must identify every teammate and no non-teammate to qualify for points. If they qualify, they get one point for each teammate who also correctly identified them.
- An impostor choosing safe play gets 1 point if actually an impostor, otherwise 0.
- An impostor choosing risk gets 0 if not actually an impostor or if no one identifies them as a teammate. Otherwise they get 1 point plus one per player who identified them as a teammate.
- Highest score wins; ties at the maximum share the victory.
- A new round can start only if enough unused piles remain for that player-count range.

## Implementation guidance
- Keep role assignment and scoring in a testable domain layer, separate from UI and transport.
- Use explicit inputs and outputs for scoring; avoid hidden reads from global state.
- Add table-driven tests for teams of two and three, omitted teammates, false teammates, reciprocal recognition, safe impostors, risky impostors with zero/one/multiple recognizers, and non-impostors selecting an impostor strategy.
- Do not infer hidden roles from client-side display state.
- Do not alter the game rules to simplify implementation. Raise rule ambiguities before coding.

## Scope warning
Do not implement these rules during OOC-002 merely because this skill describes them. Apply them only when the relevant backlog stories are in scope and the GDD is approved.
