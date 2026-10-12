---
name: ooc-project-workflow
description: Apply the Out Of Context project conventions, backlog workflow, scope control, and documentation standards. Use when starting a task, changing project structure, reviewing scope, or deciding what to implement next.
---

# Out Of Context — Project Workflow

## Purpose
Keep implementation aligned with the approved Out Of Context (OOC) documents and backlog. Work incrementally and avoid building features before their backlog scope is approved.

## Source of truth
- `docs/GAME_DESIGN_DOCUMENT.md` is the functional source of truth for game rules once OOC-001.6 is approved.
- `docs/BACKLOG.md` defines scope, dependencies, priorities, and acceptance criteria.
- `docs/ARCHITECTURE.md` defines technical architecture when it exists.
- If these documents conflict, do not silently choose one. Identify the conflict and ask for a decision or propose a documented correction.
- Do not invent or “improve” rules from Mimic Octopus. Preserve the approved rules exactly.

## Agreed initial stack
- Android client: Flutter and Dart in `apps/mobile/`.
- Backend: Django and Django REST Framework in `backend/`.
- Realtime transport: Django Channels / WebSockets when the relevant backlog item is reached.
- Database: PostgreSQL, configured for local development through `infra/docker-compose.yml`.
- `contracts/` contains API/event contracts shared or documented across client and backend.
- `docs/` contains project documentation.
- Keep secrets out of source control; provide `.env.example` with placeholders.

## Working procedure
1. Read the relevant backlog epic/story and its dependencies.
2. Inspect the repository before creating or moving files.
3. State the narrow scope of the change and the acceptance criteria being addressed.
4. Implement the smallest coherent increment.
5. Run the relevant formatter, static checks, tests, and build checks available in the environment.
6. Report changed files, commands executed, results, limitations, and remaining work.
7. Update documentation or backlog status only when the work and acceptance criteria justify it.

## Scope guardrails
- Do not implement game rules, scoring, complete rooms, final UI, or other later-epic features while working on OOC-002 unless explicitly requested.
- Do not add dependencies, services, frameworks, abstractions, CI systems, or deployment infrastructure without a clear need and explicit project alignment.
- Do not claim a command passed if it was not actually run.
- If tooling is unavailable, state that clearly and provide the exact command the developer can run locally.
- Prefer Spanish for project-facing documentation and explanations; keep identifiers and code conventions idiomatic to each language.
- On Windows, prefer PowerShell-compatible commands unless the repository specifies another shell.

## Completion report
At the end of a task, summarize:
- Scope completed
- Files added or modified
- Validation commands and actual outcomes
- Acceptance criteria met or not met
- Decisions or blockers requiring the user's input
