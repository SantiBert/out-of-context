---
name: secrets-and-environments
description: Configure local and deployment environments safely for the Out Of Context monorepo, including environment variables, Docker Compose, Git ignore rules, and secret handling.
---

# Secrets and Environments

## Principles
- Never commit real credentials, tokens, private keys, production URLs containing credentials, or populated `.env` files.
- Provide `.env.example` with variable names and safe placeholder values only.
- Ensure `.env`, virtual environments, caches, generated Flutter output, local databases, and IDE-specific state are appropriately ignored by Git.
- Do not place secrets in Flutter assets or compile-time client configuration. Anything shipped in an Android app must be treated as public.
- Use separate local-development and production settings. Never silently enable debug settings in production.
- Do not expose database ports publicly unless local development explicitly requires host access; document the binding and use safe defaults.
- Pin service image versions deliberately rather than relying on `latest`.
- Persist local database data only through an explicitly documented Docker volume.
- Avoid adding a new infrastructure service unless a backlog item or architecture decision requires it.

## Environment workflow
1. Inspect existing `.gitignore`, environment files, Docker Compose, and settings before editing.
2. List each required variable and explain its purpose in `.env.example` or documentation.
3. Verify startup behavior when variables are missing or malformed.
4. Check `git status` and inspect staged changes before declaring the task complete.
5. If a real secret is discovered in a tracked file, do not repeat it in output. Flag it and recommend rotation/removal from repository history as appropriate.

## Local PostgreSQL
- Use environment variables for database name, username, and password.
- Document startup, readiness, connection settings, and shutdown commands.
- Do not delete volumes or reset a developer's database without explicit permission.
- Keep credentials out of Compose literals where environment substitution can be used.
