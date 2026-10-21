# Plan de rediseño UI/UX — Out Of Context

**Historia:** OOC-020.1 — Auditoría visual y plan de migración UI/UX  
**Fecha:** 2026-10-18  
**Alcance de este documento:** auditoría del frontend actual, propuesta de design system, plan incremental, assets faltantes y riesgos.  
**No implementa código.** No elimina componentes. No cambia reglas de negocio. No introduce dependencias.

Identidad aprobada (producto): paleta **menta, navy, crema, amarillo y coral**; tipografía **redondeada**; ilustraciones **cartoon**. Las pantallas deben ser **nativas reales** (React Native), no imágenes estáticas usadas como pantalla completa.

---

## 1. Objetivo y restricciones

### Objetivo

Sustituir la UI funcional/minimal actual por una identidad visual coherente, manteniendo los flujos online y presencial ya implementados, con componentes nativos y tokens centralizados.

### Restricciones

- No usar PNG/JPG a pantalla completa como “pantalla”.
- No inventar funcionalidades que no existan en el código o el backlog.
- No cambiar reglas de puntuación, revelación, votación ni contratos API/WebSocket.
- Preservar los contratos UX de OOC-019.6 / .8 / .9 (pase privado, carga sin roles, resultados post-confirmación, CTAs de cierre).
- Hex y tipografía del kit de marca quedaron definidos en OOC-020.2 (`docs/DESIGN_SYSTEM.md`, `mobile/src/theme/theme.ts`).

### Fuentes consultadas

- Código: `mobile/src/` (screens, components, theme, navigation, hooks, services, features/local).
- Docs: `GAME_DESIGN_DOCUMENT.md`, `ARCHITECTURE.md`, `BACKLOG.md`, `UX_AUDIT.md`, `OOC-019_REGRESSION_REPORT.md`, navegación/persistencia presencial.

---

## 2. Auditoría del estado actual

### 2.1 Estructura del frontend

```
mobile/src/
  app/           GuestSessionProvider, RoomConnectionProvider
  components/    primitivos + controles locales
  config/        env
  features/local catalog, match, rules (sin componentes UI propios)
  hooks/         useAppNavigation
  navigation/    AppNavigator, routes
  screens/       15 pantallas
  services/      api/, realtime/, session/
  theme/         theme.ts
  types/
```

Navegación: un solo native-stack; parámetros de ruta vacíos (no viajan token, carta ni puntos).

### 2.2 Pantallas (15)

| Ruta | Archivo | Modo | Rol |
|---|---|---|---|
| `Home` | `HomeScreen.tsx` | Hub | Entrada online + presencial + recovery |
| `CreateRoom` | `CreateRoomScreen.tsx` | Online | Crear sala |
| `JoinRoom` | `JoinRoomScreen.tsx` | Online | Unirse |
| `Lobby` | `LobbyScreen.tsx` | Online | Lobby |
| `SecretCard` | `SecretCardScreen.tsx` | Online | Carta secreta |
| `Conversation` | `ConversationScreen.tsx` | Online | Conversación |
| `Voting` | `VotingScreen.tsx` | Online | Votación |
| `Results` | `ResultsScreen.tsx` | Online | Resultados de ronda |
| `Scoreboard` | `ScoreboardScreen.tsx` | Online | Marcador |
| `Catalog` | `CatalogScreen.tsx` | Dev | Showcase de componentes |
| `LocalSetup` | `LocalSetupScreen.tsx` | Presencial | Nombres 4–8 |
| `LocalCard` | `LocalCardScreen.tsx` | Presencial | Pase de carta |
| `LocalTable` | `LocalTableScreen.tsx` | Presencial | Mesa |
| `LocalRecord` | `LocalRecordScreen.tsx` | Presencial | Carga de gestos |
| `LocalResults` | `LocalResultsScreen.tsx` | Presencial | Resultados / marcador |

No hay pantallas huérfanas ni rutas sin screen.

### 2.3 Componentes (`mobile/src/components/`)

| Componente | Uso principal |
|---|---|
| `Button` | CTAs (primary / secondary / destructive) |
| `TextField` | Inputs con error |
| `Heading`, `HelperText` | Jerarquía de texto |
| `Message` | Alertas error / warning |
| `EmptyState` | Vacío (poco usado fuera de Setup/Catalog) |
| `ContentCard` | Contenedor con elevación (sobre todo local) |
| `StatusBadge` | Roles en resultados locales + Catalog |
| `LoadingIndicator` | Solo demo Catalog; pantallas reales usan “Cargando” en HelperText |
| `ConfirmAction` | Modales de confirmación |
| `screenStyles` | Layout centrado (online) |
| `LocalAbandonControl` | Abandonar |
| `LocalRestartControl` | Reiniciar |
| `LocalPlayAgainControl` | Volver a jugar |
| `LocalChangePlayersControl` | Cambiar jugadores |
| `ScreenPlaceholder` | **Eliminado** en OOC-020.12 (0 consumidores) |

### 2.4 Tema actual (`mobile/src/theme/theme.ts`)

| Grupo | Estado |
|---|---|
| Colores | Blanco `#ffffff`, primary `#1f4b99`, surfaces de danger/warning/success; **sin** menta/crema/coral |
| Tipografía | Sistema; `heading` 28 / `body` 16 / `label`+`helper` 14; **sin** `fontFamily` |
| Spacing / radii / touch | Escala 4–32; radii 8–12; touch 48 |
| Hex fuera de theme | Casi ninguno; overlay `rgba` en `ConfirmAction`; `#E6F4FE` en `app.json` |

### 2.5 Hooks y servicios

- Hook UI: solo `useAppNavigation`.
- API: `client`, `rooms`, `singleFlight`.
- Realtime: connection, lobby, secretCard, conversation, voting, results, scoreboard.
- Session: guestSession, secureStore.
- Dominio local: `features/local/` (reglas y match; sin capa visual propia).

### 2.6 Funcionalidades OOC-019 a preservar visualmente

| Historia | Contrato UX que el rediseño no puede romper |
|---|---|
| OOC-019.8 | Carta cubierta → Ver → Ocultar; AppState cubre sin avanzar; carga sin número/texto/rol; cubierta Continuar al entrar a Carga |
| OOC-019.9 | Una fila por persona; badges equipo/impostor; ronda vs total; clasificación; CTAs según fase |
| OOC-019.6 | Marcador: Volver a jugar / Cambiar jugadores; sin editar roster mid-match |
| OOC-019.10 | Regresión; no define look |

### 2.7 Duplicaciones y deuda

1. **HomeButton:** resuelto en OOC-020.11 (`components/HomeButton`).
2. **Layout dual:** online = `screenStyles.container` centrado; local = shells propios (deuda visual online → OOC-020.13).
3. **Cuatro controles ConfirmAction** casi clones (abandon / restart / play again / change players); `ConfirmMatchAction` no unificado.
4. **Gesto Señalar / Puño / V** aún inline en `VotingScreen` (local usa `GesturePicker`).
5. **Loading inconsistente:** `LoadingIndicator` solo en Catalog.
6. **ScreenPlaceholder:** eliminado en OOC-020.12.
7. **Assets de producto:** PNG de marca / cartoon pendientes (`BRAND_ASSETS.md`).

### 2.8 Estilos hardcodeados

- Colores de producto centralizados en `theme.ts` (bien para migrar tokens).
- Muchos `StyleSheet.create` locales por pantalla (23 archivos) con patrones repetidos de `content` / `name` / puntos.
- Sin tipografía custom ni imágenes in-app.

---

## 3. Identidad aprobada (tokens semánticos)

Kit aplicado en **OOC-020.2** (detalle en `docs/DESIGN_SYSTEM.md`):

| Token semántico | Hex / rol |
|---|---|
| `mint` | `#2EC4A6` — primario de acción |
| `navy` | `#0F4C81` — texto / títulos |
| `cream` | `#F7F3E9` — fondo |
| `yellow` | `#F4B400` — aviso / acento |
| `coral` | `#FF6B6B` — destructivo / error |
| Tipografía | Baloo 2 (títulos, OFL) + sistema (UI) |

Mapeo en `theme.colors`: `background` → cream; `surface` → white; `primary` → mint; `text` → navy; `danger` → coral; `success` → turquoise.

Ilustraciones: estilo **cartoon**, usadas como **elementos** dentro de layouts nativos (hero parcial, sticker, vacío), nunca como captura a pantalla completa.

---

## 4. Arquitectura de design system (propuesta)

```mermaid
flowchart TD
  tokens[theme_tokens]
  primitives[primitives_Button_Field_etc]
  compounds[compounds_HomeButton_GesturePicker]
  screens[screens_online_y_local]
  tokens --> primitives
  primitives --> compounds
  compounds --> screens
```

### Capas

1. **Tokens** — ampliar `mobile/src/theme/theme.ts` (colors semánticos, typography con `fontFamily` cuando exista el archivo de fuente, spacing/radii/elevation ya presentes).
2. **Primitivos** — evolucionar Button, TextField, Heading, HelperText, Message, ContentCard, StatusBadge, LoadingIndicator, ConfirmAction, EmptyState sin romper APIs públicas salvo migración controlada.
3. **Compuestos** (nuevos o extraídos, en historias posteriores):
   - `HomeButton` / navegación a Inicio
   - `Screen` / `ScreenScroll` (unificar layouts)
   - `GesturePicker` (Señalar / Puño / V)
   - `ConfirmMatchAction` (parametrizar los cuatro controles locales)
   - Filas de resultado / clasificación (hoy embebidas en LocalResults)
4. **Pantallas** — solo composición; sin hex locales; sin lógica de scoring en UI.

### Catalog

`CatalogScreen` sigue siendo el banco de prueba visual (OOC-020.2) antes de migrar flujos de partida.

### Tipografía y fuentes

- No añadir dependencia de fuentes en 020.1.
- En 020.2: cargar fuente redondeada vía mecanismo ya disponible en Expo **solo cuando el asset exista en el repo**; hasta entonces, tokens tipográficos con tamaños/pesos y `fontFamily` opcional.

---

## 5. Plan incremental de migración

Orden fijo. Cada paso entrega pantallas nativas usables; no se “tapa” con mockups estáticos.

| Historia | Entrega | Pantallas / piezas | Criterio de hecho |
|---|---|---|---|
| **OOC-020.2** | Tokens + tipografía + primitivos | `theme.ts`, componentes base, Catalog | Catalog muestra paleta nueva; sin romper tests de dominio |
| **OOC-020.3** | Identidad gráfica y logo | `brandAssets`, BrandLogo/Mark, splash/icon config | Registro + wordmark; PNG finales documentados como pendientes |
| **OOC-020.4** | Home y entradas | Home (Create/Join intactos) | Jerarquía marca → Jugar/Continuar → online; DONE |
| **OOC-020.5** | Selección de modo | ModeSelect, OnlineEntry, ModeSelectCard | Un dispositivo / Multidispositivo; DONE |
| **OOC-020.6** | Gestión de jugadores | LocalSetup + PlayerRosterRow | 4 slots + Añadir ≤8; Continuar mint; sin Abandon/Inicio; DONE |
| **OOC-020.7** | Confirmación de partida | LocalMatchConfig | Resumen dominio + Comenzar; sin opciones inventadas; DONE |
| **OOC-020.8** | Reparto privado | LocalCard + PrivateDealFrame + SituationCard | Navy; sheet deslizante + Continuar/`seen` + Back previo; AppState; personaje PNG pendiente; DONE |
| **OOC-020.9** | Mesa / Carga local | LocalTable + LocalRecord + GesturePicker | Navy mesa; cream carga; privacidad OOC-019; DONE |
| **OOC-020.10** | Resultados / clasificación | LocalResults + ResultPlayerCard + StandingRow | Cream; sin recalcular puntos; DONE |
| **OOC-020.11** | Nav, animaciones, a11y | HomeButton, reduce-motion, Atrás local | Contraste documentado; sin libs nuevas; DONE |
| **OOC-020.12** | Integración / cleanup | Informe + borrar ScreenPlaceholder | typecheck/lint/Jest; GO presencial; DONE |
| **OOC-020.13** | Flujo online UI | Lobby → … → Scoreboard | Misma autoridad servidor; sin filtrar cartas ajenas |

### Principios por fase

- Migrar **look** sin reescribir dominio (`features/local`, `services/realtime`).
- Unificar layout al tocar cada pantalla (preferir `ScreenScroll` en formularios largos).
- Regresión: suite Jest mobile + smoke de OOC-019.10 al cerrar rediseños de flujo local/online.

---

## 6. Assets gráficos faltantes

| Asset | Prioridad | Notas |
|---|---|---|
| Fuente redondeada (archivos + licencia) | Alta | Hecho en 020.2 (Baloo 2 + OFL) |
| Valores hex del kit | Alta | Hecho en 020.2 |
| Logo horizontal light/dark | Alta | Bloqueado; ver `docs/BRAND_ASSETS.md` (020.3) |
| Icono de app + adaptive Android de marca | Alta | Bloqueado; cream en adaptive; arte Expo de puente |
| Splash de marca | Media | Cream + `splash-icon` Expo de puente |
| Ilustración Home / atmósfera mesa | Media | Elemento, no pantalla (020.4/020.7) |
| Carta cubierta / dorso cartoon | Alta para 020.5/020.7 | Debe convivir con Ver/Ocultar |
| Iconos o stickers de gestos (Señalar, Puño, V) | Media | GesturePicker |
| Stickers Equipo / Impostor (post-revelación) | Media | Solo resultados |
| Vacío / error cartoon | Baja | EmptyState / Message |
| Victoria / empate | Baja | Marcador final |

Hasta tener PNG de marca: wordmark Baloo + placeholders nativos (`BrandLogo` / `BrandMark`).

---

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sustituir pantallas por imágenes estáticas | Alto — rompe interacción y a11y | Prohibido explícitamente; assets solo como nodos hijos |
| Filtrar carta/rol en Carga o Carta ajena | Alto — rompe reglamento y OOC-019.8 | Checklist de privacidad en 020.4; tests existentes de privacy |
| Recalcular puntos en UI al “embellecer” resultados | Alto | Seguir `localResultView` / scoreboard servidor |
| Contraste crema + menta insuficiente | Medio | Validar en 020.2/020.8; navy para texto |
| Dualidad online/local duplica trabajo visual | Medio | Compuestos compartidos (GesturePicker, layouts) |
| Persistencia Map (partida se pierde al matar proceso) | Fuera de look | OOC-019.7; no mezclar con rediseño |
| Inicio no aclara pausa vs abandono | Producto abierto | 020.4 puede mejorar jerarquía; no inventar borrado sin decisión |
| Dependencias nuevas (fuentes, Lottie, etc.) | Proceso | Cada dependencia requiere historia explícita; 020.1 no añade ninguna |

---

## 8. Fuera de alcance de OOC-020.1

- Cualquier cambio en `mobile/src/**` o dependencias.
- Implementar OOC-020.2–020.8.
- AsyncStorage / recovery en disco (OOC-019.7).
- Descartar documento inválido; diálogo Inicio/atrás.
- Re-ver carta ya oculta.
- Cambios de backend o contratos.

---

## 9. Resumen ejecutivo

OOC-020 **DONE** para presencial + a11y + cleanup (informe `docs/OOC-020_INTEGRATION_REPORT.md`). Design system y flujo local migrados; faltan PNG de marca y el look online. OOC-019 se respetó en privacidad y scoring.

**Siguiente historia sugerida:** Flujo online UI (**OOC-020.13**); privacidad OOC-019.
