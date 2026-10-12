---
name: django-channels-realtime
description: Design and implement Out Of Context realtime communication using Django Channels, ASGI, WebSockets, and explicit event contracts when realtime backlog items are in scope.
paths:
  - "backend/**/*.py"
  - "contracts/**"
---

# Django Channels and Realtime

## When to use
Use only when the relevant backlog item explicitly covers ASGI, Django Channels, WebSockets, or realtime events. During OOC-002, prepare the foundation only if required; do not implement complete gameplay messaging.

## Design principles
- Define each event in `contracts/` before implementing producer and consumer behavior.
- Document event name, direction, payload schema, required fields, validation, error behavior, and privacy classification.
- Validate every inbound message. Treat all client payloads as untrusted.
- Authenticate the connection and authorize room membership before sending or receiving room-specific data.
- Never trust a client to declare its own role, score, teammates, vote outcome, or game phase.
- Keep private card information scoped to the authorized player. Broadcast only data intended for every room member.
- Separate public room events from private player events.
- Define behavior for disconnects, reconnects, duplicate messages, stale actions, and invalid phase transitions before relying on them.
- Use explicit event identifiers or idempotency handling when repeated delivery could duplicate a state change.
- Do not assume in-memory channel layers are suitable for multi-process deployment. Document when a shared channel layer such as Redis becomes necessary.

## Implementation workflow
1. Read the relevant backlog story and architecture.
2. Draft or update the event contract.
3. Implement the smallest consumer/handler that satisfies the contract.
4. Add tests for valid messages, invalid payloads, authorization failures, and privacy boundaries.
5. Verify the configured ASGI application and channel layer.
6. Document how to run the tests and any local service requirements.

## Guardrails
- Do not create a full room system or gameplay protocol as part of repository scaffolding.
- Do not broadcast a player's secret card to a group channel.
- Do not use client-supplied timestamps or claimed state as authoritative without validation.
- Do not add Redis before the agreed architecture and backlog require it.
