---
name: monorepo-bootstrap
description: Set up and maintain the Out Of Context monorepo, including the React Native TypeScript mobile app, Django REST backend, shared contracts, documentation, infrastructure, and local development environment.
---

# Monorepo Bootstrap — Out Of Context

## Objective

Create and maintain a predictable monorepo for Out Of Context, with a React Native + TypeScript mobile client and a Django + Django REST Framework backend.

The repository must support local development, automated testing, clear separation of responsibilities, and future deployment.

## Target repository structure

Use this as the target structure, adapting it to the existing repository when necessary.

    .
    ├── mobile/
    │   ├── src/
    │   ├── package.json
    │   └── ...
    ├── backend/
    │   ├── manage.py
    │   ├── config/
    │   ├── apps/
    │   ├── tests/
    │   └── requirements/
    ├── contracts/
    │   ├── api/
    │   └── realtime/
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── GAME_DESIGN_DOCUMENT.md
    │   └── BACKLOG.md
    ├── infra/
    │   └── docker/
    ├── .cursor/
    │   └── skills/
    ├── .gitignore
    ├── .env.example
    ├── docker-compose.yml
    └── README.md

Do not create placeholder files or directories without a concrete purpose. Preserve existing files and follow the actual names already used in the repository if they are documented.

## Mandatory technology decisions

- Mobile: React Native + TypeScript.
- Backend: Python + Django + Django REST Framework.
- Database: PostgreSQL.
- Real-time communication: Django Channels and WebSockets when required.
- Local infrastructure: Docker Compose where appropriate.
- API and event contracts: documented under `contracts/`.
- Version control: Git.

Do not assume Expo, React Native Community CLI, a JavaScript package manager, or a dependency-management tool has already been selected. Inspect the repository and existing decisions first. If a choice is necessary but undocumented, present the options and their trade-offs before making a major architectural change.

## Initial audit

Before creating or modifying files:

1. Inspect the Git status and current branch.
2. List the existing root directories and important configuration files.
3. Inspect `README.md`, package manifests, lockfiles, Python dependency files, Docker configuration, and architecture documentation.
4. Identify which components are already initialized.
5. Check whether the repository contains uncommitted changes.
6. Report conflicts between the current state and the target architecture.

Never overwrite user work merely to match the target structure.

## Mobile application

The mobile app must live under `mobile/`.

- Use React Native and TypeScript.
- Keep mobile-specific dependencies and scripts in the mobile package unless the repository explicitly uses workspace-level tooling.
- Configure Android development according to the chosen React Native initialization method.
- Keep application configuration separate from secrets.
- Provide a clear local development workflow.
- Configure linting, type checking, and tests appropriate to the selected tooling.

If initializing a new app, choose Expo or React Native Community CLI based on the project's requirements and existing decisions. Do not initialize both.

Do not move the mobile app to the repository root without explicit approval.

## Backend application

The backend must live under `backend/`.

- Use Django and Django REST Framework.
- Separate Django configuration from domain applications.
- Keep business logic outside views when practical.
- Use Django migrations for database schema changes.
- Read environment-specific configuration from environment variables.
- Provide automated tests for business rules and API behavior.
- Keep secrets out of source control.
- Use a consistent Python dependency-management approach.

Do not introduce a Node.js backend or access PostgreSQL directly from the mobile client.

## Contracts

The `contracts/` directory contains shared documentation and definitions for communication between the mobile app and backend.

Use it to document:

- HTTP endpoints, methods, request bodies, and response bodies.
- Authentication requirements and error formats.
- WebSocket event names and payload schemas.
- Server-authoritative game state and state transitions.
- Versioning and compatibility considerations.

Do not duplicate large amounts of generated code manually. If code generation is adopted, document the source of truth and generation process.

If an endpoint or event contract changes, update its documentation and relevant tests in the same task.

## Local infrastructure

Use Docker Compose for services that benefit from a reproducible local environment, especially PostgreSQL and the backend when appropriate.

- Provide an `.env.example` with variable names and safe placeholder values.
- Never commit real credentials.
- Add persistent database storage where appropriate.
- Add health checks when they provide meaningful readiness information.
- Avoid exposing database ports unnecessarily.
- Document which services run in containers and which run directly on the developer's machine.
- Make service hostnames and ports explicit.
- Ensure the mobile app uses an address reachable from the actual Android emulator or device.

Do not assume `localhost` has the same meaning inside a container, on the host machine, and inside an Android emulator.

Do not store PostgreSQL credentials or privileged secrets in the mobile application.

## Root documentation

The root `README.md` should explain:

- Project purpose.
- Repository structure.
- Required development tools.
- How to configure local environment variables.
- How to start the backend and database.
- How to start the mobile app.
- How to run tests and quality checks.
- Links to architecture, game rules, and backlog documentation.

Keep detailed architecture decisions in `docs/ARCHITECTURE.md`, not duplicated across multiple documents.

## Git and generated files

- Respect the existing `.gitignore`.
- Exclude environment files containing secrets, local databases, caches, build outputs, and generated artifacts where appropriate.
- Keep safe templates such as `.env.example` under version control.
- Do not commit dependency folders, virtual environments, local database files, or signing credentials.
- Never delete or rewrite Git history.
- Do not commit changes unless explicitly requested.

## Execution strategy

Work incrementally:

1. Audit.
2. Propose or confirm the target structure.
3. Create or update root configuration.
4. Initialize the mobile app.
5. Initialize the backend.
6. Configure local infrastructure.
7. Define health checks and API contracts.
8. Run the relevant validation commands.
9. Update documentation with actual setup instructions.

Respect task dependencies. Do not mark later steps complete when their prerequisites are missing.

## Completion checklist

Before declaring bootstrap complete:

- The actual directory structure matches the documented architecture.
- The mobile app uses React Native + TypeScript.
- The backend uses Django + Django REST Framework.
- PostgreSQL configuration is documented and reproducible.
- Environment templates contain no real secrets.
- Existing work and Git history remain intact.
- Mobile and backend commands are documented and verified where possible.
- Relevant quality checks have been executed.
- `README.md` and `docs/ARCHITECTURE.md` describe the implementation that actually exists.
- Remaining setup decisions and limitations are clearly listed.