# OOC-020 — Informe de integración final

Fecha: 2026-10-18  
Historia de cierre: **OOC-020.12**  
Alcance cerrado: rediseño **presencial + shell compartido** (020.1–020.12). Look online diferido a **OOC-020.13**.

## Pantallas migradas (nuevo look)

| Pantalla | Historia |
|---|---|
| `HomeScreen` | OOC-020.4 |
| `ModeSelectScreen` | OOC-020.5 |
| `OnlineEntryScreen` | OOC-020.5 |
| `LocalSetupScreen` | OOC-020.6 |
| `LocalMatchConfigScreen` | OOC-020.7 |
| `LocalCardScreen` | OOC-020.8 |
| `LocalTableScreen` | OOC-020.9 |
| `LocalRecordScreen` | OOC-020.9 |
| `LocalResultsScreen` | OOC-020.10 |
| `CatalogScreen` | OOC-020.2+ (banco DS) |

## Pantallas funcionales sin rediseño de partida

| Pantalla | Notas |
|---|---|
| `CreateRoomScreen` / `JoinRoomScreen` | Tokens cream, `HomeButton`, KAV (020.11); layout de formulario |
| `LobbyScreen` | Pre-rediseño; `screenStyles` |
| `SecretCardScreen` | Pre-rediseño |
| `ConversationScreen` | Pre-rediseño |
| `VotingScreen` | Pre-rediseño; gestos inline (no `GesturePicker`) |
| `ResultsScreen` / `ScoreboardScreen` | Pre-rediseño |

## Componentes nuevos (020.2–020.11)

- Identidad: `BrandLogo`, `BrandMark`
- Entradas: `ModeSelectCard`
- Local: `PlayerRosterRow`, `DashedButton`, `PrivateDealFrame`, `SituationCard`, `GesturePicker`, `ResultPlayerCard`, `StandingRow`
- Nav/a11y: `HomeButton`
- Hooks: `useReducedMotion`, `useExitToHomeOnBack`
- Helpers: `stackScreenAnimation`, `exitToHomeRoutes`, presentaciones locales (`tablePresentation`, `recordPresentation`, etc.)
- Design system base ya existente actualizado a tokens de marca (Button, ConfirmAction, theme, fonts Baloo 2)

## Componentes eliminados

| Componente | Motivo |
|---|---|
| `ScreenPlaceholder` | 0 referencias en screens/features/App/tests; eliminado en OOC-020.12 |

**No eliminados (con uso):** `LoadingIndicator`, `ProgressIndicator`, `ScreenHeader` (Catalog); controles Local\* + `ConfirmAction`; pantallas online.

## Validación ejecutada (resultados reales)

Comandos en `mobile/` (2026-10-18):

| Comando | Exit code | Resultado |
|---|---|---|
| `npm run typecheck` | 0 | `tsc --noEmit` OK |
| `npm run lint` | 0 | `expo lint` OK |
| `npm test` | 0 | **48** suites, **268** tests, 0 fallos |

Cobertura por criterio (suites existentes, no inventadas):

| Criterio | Suites representativas |
|---|---|
| Creación / config partida | `matchConfig`, `modeSelect`, `homeEntry` |
| Jugadores | `localSetup`, `localSetupUi` |
| Reparto privado | `localCardUi`, `localCardPrivacy`, `localViewing` |
| Conversación / votación física | `localTableUi`, `localRecordUi`, `localVote` |
| Resultados / clasificación | `localResultsUi`, `localResultsPresentation`, `localResult` |
| Reinicio / abandono / volver a jugar | `localRestart`, `localAbandon`, `localPlayAgain` |
| Persistencia / recuperación | `localRecovery`, `localResume`, `localAutosave`, `localResumePrivacy` |
| Regresión presencial | `localOoc019Regression`, `localFlow` |
| Online (sin rediseño visual) | `flow`, `lobby`, `voting`, `conversation`, `secretCard`, `results`, `scoreboard`, `connection`, `guestSession` |
| Nav / a11y | `homeButton`, `navigationA11y`, `routes` |

No se ejecutaron playtests manuales en dispositivo ni APK en esta historia.

## Defectos / deuda pendiente

1. **Look online** (Lobby → Scoreboard) aún pre-rediseño → **OOC-020.13**.
2. **PNG de marca** (logo, icono, splash) bloqueados; puente tipográfico en uso (`BRAND_ASSETS.md`).
3. **Assets cartoon** (dorso carta, stickers gestos/roles) no embebidos.
4. **`ConfirmMatchAction`** no unificado; cuatro controles Local\* siguen separados.
5. **Inicio** no aclara en copy si pausa o abandona (comportamiento: Inicio deja el documento; Abandonar borra) — deuda de producto previa.
6. Persistencia solo en memoria (Map): fuera de alcance de look (OOC-019.7).

## Recomendación GO / NO-GO

| Pregunta | Veredicto |
|---|---|
| ¿Cerrar el rediseño **presencial + a11y compartida** (OOC-020.1–020.12)? | **GO** |
| ¿Declarar el producto **100% unificado visualmente** (incluye online)? | **NO-GO** hasta OOC-020.13 |

**Recomendación operativa:** marcar la épica OOC-020 como **DONE** respecto al alcance entregado (local + nav/a11y + cleanup), con look online explícitamente diferido a OOC-020.13.
