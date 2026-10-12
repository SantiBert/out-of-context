---
name: testing-quality
description: Plan and run focused tests, formatters, static analysis, and regression checks across the Out Of Context Flutter/Django monorepo.
---

# Testing and Quality

## General approach
- Derive tests from the backlog acceptance criteria and the approved design documents.
- Test externally observable behavior, boundary conditions, and failures—not only implementation details.
- Keep tests deterministic, isolated, and independent of external services unless an integration test explicitly requires them.
- Never weaken or delete a test simply to make a change pass. If an existing test conflicts with an approved requirement, explain the conflict.
- Do not claim a check passed unless it was executed and its result observed.

## Flutter checks
From `apps/mobile/`, when Flutter is installed:
- `dart format --output=none --set-exit-if-changed .`
- `flutter analyze`
- `flutter test`
- For Android build validation when required: `flutter build apk --debug`

## Django checks
From `backend/`, using the documented virtual environment and environment variables:
- `python manage.py check`
- `python manage.py test`
- Run any project-specific lint/type checks only if configured.

## Integration checks
- Verify the README setup instructions from a clean environment when practical.
- Verify the health endpoint and database configuration when they are part of scope.
- Test client/server contracts against `contracts/`.
- For realtime behavior, test unauthorized connections, malformed events, reconnect behavior, duplicate actions, and secret-data leakage where applicable.

## Reporting
For each check, report one of:
- Passed — command executed and passed.
- Failed — command executed and failed, with relevant concise output.
- Not run — not executed, with the reason.
- Blocked — could not execute because a prerequisite is missing.

Do not label a build or test suite as successful based only on code inspection.
