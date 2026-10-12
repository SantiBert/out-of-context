---
name: testing-quality
description: Define and execute testing and quality checks for Out Of Context across React Native, TypeScript, Django, Django REST Framework, PostgreSQL, WebSockets, and game rules.
---

# Testing & Quality — Out Of Context

## Objective

Maintain correctness, reliability, and security across the Out Of Context monorepo.

Testing must protect the game's rules, hidden information, simultaneous voting, scoring, API behavior, and real-time synchronization.

## General principles

- Inspect the existing project configuration before choosing commands or adding tools.
- Test observable behavior rather than implementation details wherever practical.
- Prefer deterministic tests.
- Avoid arbitrary sleeps and timing-dependent assertions.
- Mock external services in unit tests.
- Use integration tests when interactions between components matter.
- Do not weaken or delete a test merely to make a change pass.
- Do not claim a check passed unless it was executed and its result inspected.
- Report skipped tests, environment limitations, and known failures.
- Avoid introducing dependencies without a clear benefit.

## Test layers

### 1. Static analysis and formatting

For the mobile app, run the scripts configured in `mobile/package.json`. Typical checks include:

- TypeScript type checking.
- ESLint.
- Formatting verification, if a formatter is configured.

For the backend, use the configured Python tools. Typical checks include:

- Django system checks.
- Python linting.
- Python formatting verification.
- Static type checking, if configured.

Use the actual project configuration. Do not assume a tool is installed merely because it is common.

### 2. Unit tests

Use unit tests for isolated logic, including:

- Game-rule calculations.
- State transitions.
- Validation and serialization.
- Score calculation.
- API client error handling.
- WebSocket event parsing.
- UI behavior and reusable components.

Backend game rules should be tested independently of HTTP views and database infrastructure when practical.

### 3. Integration tests

Use integration tests to verify interactions between:

- Django views, serializers, permissions, and services.
- Django and PostgreSQL.
- Django Channels consumers and channel layers.
- API clients and backend endpoints.
- Real-time events and authoritative game state.

Use a test database and isolated test data. Do not run destructive tests against a development or production database.

### 4. End-to-end tests

Add end-to-end tests when the tooling and project maturity support them.

Prioritize essential flows:

1. Create or join a room.
2. Join the required number of players.
3. Start a valid game.
4. Deal hidden cards without exposing other players' cards.
5. Advance through the round phases.
6. Complete voting.
7. Calculate and display scores.
8. Complete the game and display final results.

Do not block all development on an end-to-end framework before the core unit and integration tests exist.

## Mobile quality checks

The mobile app is React Native + TypeScript.

- Run the actual package scripts for linting, type checking, and tests.
- Test components with the configured React Native testing tools.
- Test loading, success, empty, and failure states.
- Test navigation behavior where it is part of the feature.
- Test network errors, malformed payloads, and reconnect behavior.
- Test that hidden card information is not rendered or retained unnecessarily.
- Check that UI controls cannot advance phases without server authorization.
- Verify that relevant Android builds succeed when the local environment supports them.

Do not assume Expo commands, Community CLI commands, Jest, or another test runner are available until the project configuration confirms them.

## Backend quality checks

Use the configured Python environment and project scripts.

Common Django validation commands include:

    python manage.py check
    python manage.py test

Run them from the directory containing `manage.py`, using the appropriate virtual environment or container.

Additional checks may include:

- Migration consistency checks.
- Serializer and API tests.
- Permission and authentication tests.
- Database constraint tests.
- WebSocket consumer tests.
- Concurrency and duplicate-event tests.

Run migration checks when model or schema changes are made. Do not apply migrations to production as part of an ordinary validation task.

## Game-rule test requirements

Protect the following requirements from the game design document.

### Player counts and card piles

- A game supports the documented player counts: 4–8.
- For 4–6 players, use 15 piles of 3 identical cards and select 3 piles per round.
- For 7–8 players, use 16 piles of 3 identical cards and select 4 piles per round.
- Each round consumes its selected piles.
- A new round cannot begin unless enough unused piles remain for that player-count group.
- Only cards from the selected piles are combined, shuffled, and dealt.
- Each player receives one private card; remaining cards go to the discard pile.

### Hidden roles

- Players with identical dealt cards form teams.
- Players whose card is unique among the dealt cards are impostors.
- The game may have zero, one, or multiple impostors.
- A player must not receive another player's hidden card through the API, WebSocket messages, errors, or client-facing logs.

### Voting

- Every player must submit a valid vote gesture.
- The vote must follow the simultaneous-voting rules.
- The server must validate that the player is allowed to vote in the current phase.
- Duplicate submissions must not create duplicate votes or alter a completed vote.
- Results must not be revealed prematurely.

### Scoring

- A team player scores only if they identify every teammate and identify no non-teammate.
- If that condition is satisfied, the player's score is based on the teammates who also identified them correctly.
- A safe impostor gesture earns one point only if the player is an impostor.
- A risky impostor gesture earns one base point plus one per player who identified the impostor as a teammate, provided the player actually is an impostor and at least one such player exists.
- A risky gesture earns zero if nobody identifies the impostor as a teammate.
- A player who is not an impostor scores zero for either impostor gesture.
- Score calculations must be independent of request ordering and client-provided score values.

### Round and game lifecycle

- Only valid state transitions are allowed.
- A round cannot be started twice.
- A completed round cannot be scored twice.
- A completed game cannot be restarted by a stale request.
- Reconnection must not disclose hidden cards or create duplicate participation.
- Invalid player counts and insufficient unused piles must be rejected.

If the game design document changes, update these tests to match the approved rules. Do not silently invent new game rules.

## API and real-time quality

- Validate authentication and authorization on protected operations.
- Validate request payloads and reject malformed input.
- Test expected success and failure response formats.
- Confirm that users cannot modify another player's state.
- Confirm that WebSocket connections enforce the appropriate permissions.
- Test disconnects and reconnects.
- Handle duplicate messages and out-of-order delivery where applicable.
- Avoid broadcasting private card data to an entire room.
- Use database transactions or other appropriate safeguards for critical state changes.
- Do not trust client-provided scores, roles, phase transitions, or player identities.

## Regression requirements

For each bug fix:

1. Reproduce the bug with a test when practical.
2. Implement the smallest appropriate fix.
3. Verify the new test fails before the fix when feasible.
4. Run the targeted test.
5. Run relevant neighboring tests.
6. Run broader checks when the change affects shared code or game rules.

For rule-engine changes, prioritize regression coverage of all affected scoring and lifecycle scenarios.

## Test data and security

- Use synthetic test accounts and game data.
- Do not place production credentials in tests.
- Do not log private card text or authentication tokens.
- Keep fixtures deterministic.
- Avoid depending on external production services.
- Ensure tests do not mutate persistent developer data.
- Verify authorization failures as well as successful requests.

## Reporting

At the end of a task, report:

- What changed.
- Tests and quality checks executed.
- The actual result of each relevant check.
- Tests not run and why.
- Known failures or limitations.
- Any remaining risks or follow-up work.

Distinguish clearly between a test that passed, one that failed, one that was skipped, and one that could not be executed.

Never declare the task fully validated when required checks remain unexecuted or failing.