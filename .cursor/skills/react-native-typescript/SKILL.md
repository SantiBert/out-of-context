---
name: react-native-typescript
description: Develop and maintain the Out Of Context mobile application using React Native and TypeScript. Use when creating mobile screens, components, navigation, client-side state, API integration, WebSocket integration, Android builds, or mobile tests.
---

# React Native + TypeScript — Out Of Context

## Objective

Implement the Out Of Context mobile client using React Native and TypeScript. Keep the client maintainable, testable, accessible, and consistent with the project's game rules and backend API contracts.

## Project context

- Mobile app: React Native + TypeScript.
- Backend: Django + Django REST Framework.
- Database: PostgreSQL, accessed through the backend only.
- Real-time communication: Django Channels + WebSockets when required.
- Repository: monorepo.
- Mobile app directory: `apps/mobile/`.
- Shared API contracts and protocol documentation: `contracts/`.
- Architecture and project documentation: `docs/`.

Do not introduce Flutter, Dart, or a second mobile framework.

## Before making changes

1. Inspect the repository structure and existing implementation.
2. Read `docs/ARCHITECTURE.md` if available.
3. Review the relevant requirements in the game design document and backlog.
4. Inspect `package.json` and the existing package manager lockfile before running commands.
5. Review the API contract before implementing an endpoint or WebSocket event.
6. Follow existing conventions unless they conflict with an explicit project requirement.

Do not replace existing configuration or generate a new application inside a populated directory without inspecting the current files first.

## TypeScript rules

- Prefer strict TypeScript settings.
- Avoid `any`. Use `unknown` when a value has not been validated.
- Model domain objects with explicit types.
- Represent API responses, requests, and WebSocket messages with typed interfaces or type aliases.
- Validate untrusted network data before using it when runtime validation is required.
- Use discriminated unions for states and events with different payloads.
- Avoid duplicating backend-owned business rules in UI components.
- Do not use TypeScript type assertions as a substitute for validation.
- Keep functions small and focused.

## Recommended mobile structure

Adapt this structure to the existing repository rather than creating empty directories unnecessarily.

- `apps/mobile/src/app/`: app entry points and top-level providers.
- `apps/mobile/src/navigation/`: navigation configuration.
- `apps/mobile/src/screens/`: screen-level components.
- `apps/mobile/src/components/`: reusable UI components.
- `apps/mobile/src/features/`: feature-specific UI, state, and logic.
- `apps/mobile/src/services/api/`: HTTP client and API functions.
- `apps/mobile/src/services/realtime/`: WebSocket client and event handling.
- `apps/mobile/src/types/`: shared client-side types where feature-local types are inappropriate.
- `apps/mobile/src/utils/`: small, reusable utilities.
- `apps/mobile/src/theme/`: design tokens and theme configuration.
- `apps/mobile/__tests__/` or colocated test files: follow the test framework already configured.

Do not force every feature into every directory. Prefer cohesive feature modules over excessive abstraction.

## Component design

- Use function components and hooks.
- Separate presentation from network communication and game-domain logic.
- Keep screen components focused on composition and navigation.
- Extract reusable components when doing so improves clarity or avoids meaningful duplication.
- Use stable keys when rendering lists.
- Handle loading, empty, success, and error states explicitly.
- Provide accessible labels and appropriate touch targets.
- Do not rely on color alone to communicate a game state.
- Avoid unnecessary re-renders and premature optimization.

## State management

Choose the simplest state-management solution that satisfies the feature.

- Use local component state for short-lived UI state.
- Use a shared store or context only when state genuinely needs to be shared.
- Keep server-owned state distinguishable from local UI state.
- Treat the backend as authoritative for room membership, player identity, round phase, dealt cards, voting results, scores, and game completion.
- Do not assume a mutation succeeded until the server confirms it.
- Handle stale data, reconnection, and failed requests explicitly where applicable.
- Never put secrets or credentials in client-side state.

Do not add a state-management library without a clear requirement.

## API integration

- Use the backend's documented API contract.
- Centralize base URL configuration and HTTP behavior.
- Define typed request and response models.
- Handle non-success HTTP responses and network failures.
- Avoid hardcoding a production URL.
- Configure Android emulator access to the local backend according to the actual development environment.
- Do not assume `localhost` inside an Android emulator refers to the developer's host machine.
- Do not log access tokens, secrets, private card text, or other sensitive game data.
- Do not call PostgreSQL directly from the mobile app.

## WebSocket integration

When implementing real-time functionality:

- Follow the protocol documented in `contracts/` and `docs/`.
- Define typed event names and payloads.
- Handle connection, disconnection, reconnection, and malformed messages.
- Make event handlers safe against duplicate events where appropriate.
- Clean up subscriptions and socket connections when their owning lifecycle ends.
- Do not assume that a client event is authoritative.
- Use server-confirmed state to recover after reconnecting.
- Do not invent event names or payload fields when the protocol has not defined them. Document the proposed contract or ask for clarification.

## Game-rule integrity

Out Of Context includes hidden cards, team identification, impostor behavior, simultaneous voting, and scoring.

- Never expose another player's hidden card through client state, API responses, logs, or UI.
- Do not infer a player's role from information that should remain secret.
- Do not calculate authoritative scores in the mobile client.
- Do not allow client timestamps or client-provided role claims to determine the official game phase.
- Treat voting and scoring results as server-authoritative.
- Preserve simultaneous-voting semantics.
- Keep rule enforcement on the backend; the client may provide previews and feedback but must not be the source of truth.
- Avoid revealing secret card information in notifications, error messages, analytics, or debugging output.

## Styling and assets

- Follow the existing styling approach and component conventions.
- Keep design tokens centralized when the project has a shared theme.
- Avoid adding UI libraries without checking existing dependencies and requirements.
- Keep assets organized and use descriptive filenames.
- Ensure screens remain usable on different Android screen sizes.
- Handle safe areas, keyboard behavior, and device navigation appropriately.

## Testing

- Add tests for meaningful behavior, especially game-related UI states and network handling.
- Test loading, error, empty, and successful states.
- Test malformed responses and failed requests where relevant.
- Mock the backend and WebSocket layer in unit tests; do not require a live production service.
- Avoid tests that depend on arbitrary delays or real network availability.
- Use the testing framework configured in the repository.
- Do not claim tests passed unless you ran them and inspected the results.

## Dependencies and commands

- Inspect `package.json` and the lockfile before installing or upgrading dependencies.
- Use the repository's existing package manager.
- Do not mix npm, Yarn, and pnpm lockfiles.
- Do not upgrade React Native or major dependencies as an incidental change.
- Verify scripts before running them; do not assume every project has the same commands.
- Run applicable linting, type checking, tests, and Android build checks when available.

## Completion checklist

Before finishing a task:

1. Confirm the implementation matches the relevant requirements.
2. Confirm TypeScript types are correct.
3. Confirm loading and failure states are handled.
4. Confirm API and WebSocket usage matches the documented contracts.
5. Confirm hidden game information remains private.
6. Run the relevant available checks.
7. Report files changed, commands executed, results, and known limitations.
8. Identify any assumptions or contract changes that need review.