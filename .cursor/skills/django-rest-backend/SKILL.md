---
name: django-rest-backend
description: Build and maintain the Out Of Context Django backend and Django REST Framework API, including configuration, health checks, validation, permissions, and backend tests.
paths:
  - "backend/**/*.py"
  - "backend/**/settings*.py"
  - "backend/**/urls.py"
---

# Django REST Backend

## Scope
Use for Django settings, models, serializers, views, URLs, REST endpoints, and backend Python code.

## Conventions
- Follow idiomatic Python and Django patterns; use clear names and small functions.
- Keep configuration environment-driven. Never hardcode credentials, secret keys, or production endpoints.
- Separate request validation, domain behavior, persistence, and HTTP response formatting.
- Use serializers for input/output validation where appropriate.
- Use explicit HTTP status codes and consistent error response shapes.
- Avoid adding models or endpoints before the relevant backlog item requires them.
- Keep API schemas and examples aligned with `contracts/` and the architecture document.
- Apply authentication and authorization intentionally when endpoints expose user-specific or private data. Do not treat an unguessable ID as authorization.
- Do not return secrets, internal stack traces, or private card/role information in responses.

## Health endpoint
For a minimal health endpoint, return a small, stable response that confirms the application can answer requests. Only check database connectivity if the accepted requirement explicitly defines the health endpoint as a dependency/readiness check. Test the selected behavior.

## Security and configuration
- Read settings from environment variables and document required variables in `.env.example`.
- Keep `.env` ignored by Git.
- Use safe production defaults for `DEBUG`, `ALLOWED_HOSTS`, cookies, and secret keys; local development defaults must be clearly separated.
- Do not disable CSRF, authentication, permissions, or host validation merely to make a test pass.
- Do not log request bodies that could contain credentials or secret gameplay information.

## Testing
- Test successful and invalid requests, status codes, response shapes, and relevant permissions.
- Prefer Django's test client and DRF testing utilities.
- Tests must not depend on a developer's personal database or external network.
- Run the relevant test suite and report actual results. Do not claim tests passed without running them.

## Guardrails
- Do not implement room lifecycle, round distribution, role assignment, scoring, or gameplay endpoints during OOC-002 unless explicitly included in the approved story.
- Do not introduce background workers, Redis, or extra services without a documented need.
