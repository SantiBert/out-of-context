---
name: monorepo-bootstrap
description: Create or validate the Out Of Context monorepo foundation for OOC-002, including folder layout, Flutter Android app, Django backend, local PostgreSQL configuration, and baseline documentation.
---

# Monorepo Bootstrap

## When to use
Use for OOC-002 and tasks that create or validate the initial repository layout and developer setup.

## Target layout
Keep the agreed structure unless the user approves a change:

```text
.
├── apps/
│   └── mobile/              # Flutter / Dart Android client
├── backend/                 # Django / Django REST Framework
├── contracts/               # API schemas and realtime event contracts
├── docs/
│   ├── GAME_DESIGN_DOCUMENT.md
│   ├── BACKLOG.md
│   └── ARCHITECTURE.md
├── infra/
│   └── docker-compose.yml   # local PostgreSQL (and later services if justified)
├── .env.example
├── .gitignore
└── README.md
```

Do not create placeholder directories without a documented purpose. If an agreed document is not yet present in the repository, report that rather than inventing its final contents.

## Procedure
1. Inspect the repository and Git status first. Never overwrite existing work blindly.
2. Confirm that OOC-001 is sufficiently closed for the requested OOC-002 task; if its status is unclear, flag it instead of changing game rules.
3. Create the minimal folder structure.
4. Initialize Flutter specifically for Android support and verify the generated project is under `apps/mobile/`.
5. Initialize Django in `backend/` and add Django REST Framework only when required by the accepted backlog item.
6. Add a minimal health endpoint and a test for it when specified by the task.
7. Configure PostgreSQL for local development through `infra/docker-compose.yml`; keep credentials in environment variables.
8. Prepare ASGI/Channels only when the corresponding OOC-002 acceptance criteria require it. Do not implement game WebSocket flows in the bootstrap epic.
9. Add a clear README with prerequisites, setup, environment configuration, startup, and test commands.
10. Run available checks and record their actual results.

## Constraints
- Do not put Flutter inside `backend/` or Django inside `apps/mobile/`.
- Do not commit `.env`, database volumes, generated build output, virtual environments, or local IDE state.
- Avoid pinning arbitrary dependency versions. Use versions compatible with the installed toolchain and record them.
- Do not add Redis unless required by the agreed architecture/backlog item; if Channels needs a shared production channel layer later, document that dependency separately.
- Do not create gameplay models, room workflows, scoring logic, or final screens as part of the initial scaffold.

## Acceptance checklist
- [ ] Expected directories and README exist.
- [ ] Flutter Android project is recognized by Flutter tooling.
- [ ] Django starts using documented configuration.
- [ ] Health endpoint and test work if included in scope.
- [ ] PostgreSQL starts locally with documented commands.
- [ ] Environment variables and secrets are handled safely.
- [ ] Git status contains no accidental generated files or secrets.
- [ ] Commands run and any unverified checks are reported honestly.
