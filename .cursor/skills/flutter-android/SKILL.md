---
name: flutter-android
description: Implement and maintain the Out Of Context Android client using Flutter and Dart, following project scope, privacy requirements for secret cards, and maintainable widget architecture.
paths:
  - "apps/mobile/**"
---

# Flutter Android Development

## Scope
Use for Dart code, Flutter widgets, Android configuration, client-side state, and Flutter tests in `apps/mobile/`.

## Conventions
- Use idiomatic Dart, null safety, sound types, and `dart format`.
- Keep widgets focused and small; separate presentation from domain logic and data access.
- Prefer simple, explicit state management until the project architecture selects a specific solution. Do not add a state-management package without justification.
- Use `const` constructors where appropriate and avoid unnecessary rebuilds.
- Keep API calls behind a small, testable data-access layer. Do not embed HTTP or WebSocket logic directly in complex UI widgets.
- Represent loading, success, empty, and error states deliberately.
- Add accessibility labels and support sensible text scaling and screen sizes.
- Do not store secrets or server credentials in the app.

## Secret-information requirements
- A player's card is private information. Do not display another player's card, number, text, or role in normal client state or UI.
- Avoid exposing secret card data in logs, analytics, debug banners, error messages, or notifications.
- For a shared-device mode, ensure the current card can be hidden before handing the device to another player. Do not assume a privacy flow that has not been specified; document the UI decision.
- The client is not authoritative for role assignment, scoring, or final results once server-side game logic is implemented.

## Workflow
1. Read the relevant backlog item and acceptance criteria.
2. Inspect existing code and dependencies before editing.
3. Add or update widget/unit tests for behavior changed.
4. Run `dart format .`, `flutter analyze`, and relevant `flutter test` commands from `apps/mobile/` when the toolchain is available.
5. Verify Android build with `flutter build apk --debug` when the task requires build validation and the environment supports it.
6. Report commands actually run and any environment limitation.

## Guardrails
- Do not build final screens or gameplay flows during OOC-002 unless explicitly in scope.
- Do not invent API endpoints; use the accepted contract in `contracts/` or ask for clarification.
- Do not add packages for trivial functionality.
