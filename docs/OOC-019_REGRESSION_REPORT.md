# Informe de regresión OOC-019

**Fecha:** 2026-10-18  
**Historia:** OOC-019.10 — Integración y pruebas de regresión de la épica OOC-019  
**Alcance revisado:** cobertura de OOC-019.2–.5 vía .8/.9; cierre formal de OOC-019.6, .8, .9 y .10

## Comandos ejecutados

| Comando | Directorio | Resultado |
|---|---|---|
| `npm run typecheck` | `mobile/` | **PASS** (exit 0) |
| `npm run lint` | `mobile/` | **PASS** (exit 0) |
| `npm run format:check` | `mobile/` | **PASS** (exit 0; se aplicó Prettier a 12 archivos con estilo previo inconsistente) |
| `npm test` | `mobile/` | **PASS** — 34 suites, 214 tests |
| `python manage.py check` | `backend/` | **BLOQUEADO** — `REDIS_URL` obligatoria; entorno local sin Redis |
| `python manage.py test` | `backend/` | **BLOQUEADO** — falla al cargar apps (`No module named 'daphne'`) y sin `REDIS_URL` |
| `python -m ruff check .` | `backend/` | **BLOQUEADO** — `No module named ruff` |
| `python -m ruff format --check .` | `backend/` | **BLOQUEADO** — `No module named ruff` |
| `docker compose run --rm backend python manage.py test` | repo root | **BLOQUEADO** — Docker Desktop no responde (`dockerDesktopLinuxEngine` pipe ausente) |
| `npm run android` | `mobile/` | **No ejecutado** |
| `npm run test:integration` | `mobile/` | **No ejecutado** (requiere backend vivo) |
| Playtest en dispositivo / kill real del proceso | — | **No ejecutado** |

La regresión online del **cliente** quedó cubierta por la suite Jest (`flow`, `voting`, `results`, `scoreboard`, `connection`, `lobby`, `conversation`, `secretCard`, `guestSession`, etc.), incluida en `npm test`.

## Matriz de los 17 escenarios

| # | Escenario | Estado | Evidencia |
|---|---|---|---|
| 1 | Crear partida con 4 jugadores | Cubierto | `localSetup.test.ts`, `localOoc019Regression.test.ts`, `localCatalog.test.ts` |
| 2 | Agregar, editar y eliminar antes de iniciar | Cubierto | `localSetup.test.ts`, `localOoc019Regression.test.ts` |
| 3 | Máximo 8 / mínimo 4 | Cubierto | `localSetup.test.ts`, `localOoc019Regression.test.ts` |
| 4 | Iniciar y bloquear participantes | Cubierto | `localSetup.test.ts`, `localPlayAgain.test.ts`, `localOoc019Regression.test.ts` |
| 5 | Reiniciar durante reparto (`viewing`) | Cubierto | `localOoc019Regression.test.ts` |
| 6 | Reiniciar durante conversación | Cubierto | `localOoc019Regression.test.ts` |
| 7 | Reiniciar durante votación (`recording`) | Cubierto | `localOoc019Regression.test.ts` |
| 8 | Reiniciar durante resultados | Cubierto | `localOoc019Regression.test.ts`, `localRestart.test.ts` |
| 9 | Reinicio conserva jugadores y limpia progreso | Cubierto | `localRestart.test.ts`, `localOoc019Regression.test.ts` |
| 10 | Abandonar limpia estado | Cubierto | `localAbandon.test.ts`, `localOoc019Regression.test.ts` |
| 11 | Cancelar reinicio/abandono sin modificar datos | Parcial (dominio) | Asserts de documento intacto sin invocar UI `ConfirmAction` (`localRestart` / `localAbandon` / `localOoc019Regression`) |
| 12 | Finalizar y volver a jugar | Cubierto | `localPlayAgain.test.ts`, `localOoc019Regression.test.ts` |
| 13 | Cambiar jugadores tras finalizar | Cubierto | `localPlayAgain.test.ts`, `localOoc019Regression.test.ts` |
| 14 | Cerrar y reabrir la aplicación | Limitación conocida | Recovery in-process: `localRecovery.test.ts`, `localResume.test.ts`. El puerto por defecto es un `Map` en memoria: un kill real del proceso no se verificó y no sobrevive. Ver OOC-019.7 propuesto. |
| 15 | Privacidad de cartas | Cubierto | `localCardPrivacy.test.ts`, `localViewing.test.ts`, `localResumePrivacy.test.ts` |
| 16 | Sin duplicar rondas ni puntuaciones | Cubierto | `localBoard.test.ts`, `localRound.test.ts`, `localResult.test.ts`, `localFlow.test.ts` |
| 17 | Regresión modo online | Cubierto (cliente) / backend bloqueado | Suite Jest online PASS. Backend Django no corrido en este entorno. |

## Defectos encontrados y corregidos

| Defecto | Acción |
|---|---|
| `localOoc019Regression.test.ts` no tipaba el roster de setup (`LocalMatch` vs `LocalSetupMatch`) ni `it.each` con tuplas readonly | Corregido antes de cerrar typecheck |
| 12 archivos mobile con formato Prettier inconsistente (varios de OOC-019.6–.9) | Formateados; `format:check` quedó en PASS |

No se hallaron regresiones funcionales de roster lock, scoring, privacidad de carta ni CTAs de cierre en la suite automatizada.

## Pendientes

- Persistencia en disco / supervivencia al cierre del proceso (OOC-019.7 propuesto).
- Inicio / atrás del sistema: pausar vs abandonar; descartar documento inválido.
- Pruebas de componente para cancelación de `ConfirmAction` (escenario 11).
- Backend: ejecutar `manage.py test` y ruff con entorno Docker o venv + `REDIS_URL`.
- Playtest humano en dispositivo; `npm run android`; `test:integration` con backend vivo.
- Pasada visual genérica de Inicio / contraste (nota abierta en UX audit, distinta de esta regresión).

## Recomendación

**GO condicionado** para el alcance mobile/presencial de OOC-019 (gestión de partida + UX .6/.8/.9 + regresión automatizada .10).

Justificación:

- typecheck, lint, format y Jest mobile (214 tests) pasaron.
- Escenarios 1–13 y 15–16 cubiertos; 5–8 cerrados con casos por fase nuevos.
- Escenario 17: cliente online en Jest PASS; backend **no verificado aquí** por bloqueo de entorno (documentado, no inventado como PASS).
- Escenario 14: recovery en proceso vivo OK; kill de proceso = limitación conocida, no NO-GO de la lógica de juego.

**NO-GO** quedaría reservado si fallara Jest/typecheck/lint o se rompiera privacidad/scoring/roster; no ocurrió.

Para un GO de producto completo (incluye kill de app y backend CI local) hace falta OOC-019.7 y un entorno backend operable.
