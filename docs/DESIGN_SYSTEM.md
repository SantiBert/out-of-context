# Design system — Out Of Context

**Historia:** OOC-020.2  
**Código:** `mobile/src/theme/`, `mobile/src/components/`  
**Banco visual:** pantalla `Catalog` (`CatalogScreen`)

## Principios

- Pantallas **nativas** (React Native). No usar imágenes estáticas como pantalla completa.
- Colores solo desde `theme` / `brand`. No hardcodear hex en pantallas ni componentes.
- No cambiar reglas de juego ni contratos al aplicar look.
- Tipografía de títulos: **Baloo 2**. Textos de interfaz: fuente del **sistema**.

## Paleta de marca (`theme.brand`)

| Token | Hex |
|---|---|
| mint | `#2EC4A6` |
| navy | `#0F4C81` |
| cream | `#F7F3E9` |
| yellow | `#F4B400` |
| coral | `#FF6B6B` |
| turquoise | `#00C2A8` |
| lilac | `#7B61FF` |
| pink | `#FF428D` |
| navyDark | `#1A1A2E` |
| white | `#FFFFFF` |

## Tokens semánticos (`theme.colors`)

| Token | Uso |
|---|---|
| `background` | Fondo de pantalla (cream) |
| `surface` | Tarjetas e inputs (white) |
| `primary` / `onPrimary` | Acción principal (mint / white) |
| `text` / `muted` | Texto fuerte / secundario |
| `danger` / `dangerSurface` | Destructivo / error (coral) |
| `warning` / `warningSurface` | Aviso (yellow) |
| `success` / `successSurface` | Éxito (turquoise) |
| `overlay` | Fondo de modales |
| `accentYellow` / `accentLilac` / `accentPink` / `accentTurquoise` | Acentos |

## Tipografía

- Archivos: `mobile/assets/fonts/Baloo2-SemiBold.ttf`, `Baloo2-Bold.ttf`
- Licencia: SIL Open Font License 1.1 (`mobile/assets/fonts/OFL.txt`)
- Familias registradas: `Baloo2-SemiBold`, `Baloo2-Bold` (`theme.fontFamilies`)
- `typography.heading` usa Baloo 2; `body` / `label` / `helper` usan el sistema
- Carga: `useAppFonts()` en `App.tsx` vía `expo-font`

## Espacio, radios y elevación

- `spacing`: xs 4 → xxl 32
- `radii`: button/field 10, card 14, pill 999
- `sizes.touch` / `sizes.field`: 48
- `elevation.card`: sombra con `navyDark`

## Componentes

### Primitivos

| Componente | Props clave |
|---|---|
| `Button` | `label`, `onPress`, `variant`: primary \| secondary \| destructive \| accent (amarillo/navy, CTA Jugar), `disabled`, `loading` |
| `TextField` | `label`, `value`, `onChangeText`, `error?`, `disabled?` |
| `Heading` / `HelperText` | texto |
| `ContentCard` | `children` (superficie white) |
| `Message` | `tone`: error \| warning |
| `StatusBadge` | `label`, `tone`: neutral \| success \| warning \| danger |
| `EmptyState` | `title`, `message` |
| `LoadingIndicator` | `label?` |
| `ConfirmAction` | diálogo; `confirmVariant?`: primary \| destructive |
| `screenStyles.container` | layout centrado online |

### Compuestos (020.2)

| Componente | Uso |
|---|---|
| `SelectableOption` | Opción seleccionable (`selected`, `description?`) |
| `ScreenHeader` | Encabezado in-content (`title`, `subtitle?`, `action?`) |
| `ProgressIndicator` | Progreso `current` / `total` |

### Marca (020.3)

| Componente | Uso |
|---|---|
| `BrandLogo` | Wordmark Baloo o PNG si `brandAssets` está `ready`; `variant` light \| dark; `size` sm \| md \| lg |
| `BrandMark` | Glyph / ícono; PNG si ready; placeholder nativo provisional si no |
| `ModeSelectCard` | Tarjeta de modo (`tone` light \| darkAccent, `icon` device \| multi); OOC-020.5 |
| `PlayerRosterRow` | Fila de jugador (índice visual, nombre ellipsis, Editar/Quitar); OOC-020.6 |
| `DashedButton` | CTA borde discontinuo (Añadir jugador) |
| `PrivateDealFrame` | Layout navy del reparto privado (OOC-020.8) |
| `SituationCard` | Carta de situación (número + texto; sin rol) |
| `HomeButton` | Inicio unificado (reset Home; a11y «Volver al inicio»); OOC-020.11 |
| `ResultPlayerCard` / `StandingRow` | Filas de resultados y clasificación; OOC-020.10 |
| `GesturePicker` | Selección Señalar / Puño / V; OOC-020.9 |

Registro y pendientes: [`docs/BRAND_ASSETS.md`](BRAND_ASSETS.md), `mobile/src/theme/brandAssets.ts`.

## Navegación

El stack aplica `headerStyle` / `headerTintColor` / `contentStyle` desde `theme` en `AppNavigator`. Las rutas y params no cambian. Transición `fade` (o `none` con reduce-motion). En Carta/Mesa/Carga/Resultados, Atrás = Inicio (sin abandonar).

## Contraste (OOC-020.11)

Pares aprobados para UI migrada:

| Texto / control | Fondo | Uso |
|---|---|---|
| `colors.text` (navy `#0F4C81`) | `colors.background` (cream `#F7F3E9`) | Cuerpo, títulos cream |
| `brand.cream` | `brand.navyDark` (`#1A1A2E`) | Títulos/helpers en ModeSelect, Carta, Mesa |
| `colors.onPrimary` (white) | `colors.primary` (mint) | Label de botón primary |
| `brand.navy` | `brand.yellow` | Label de botón accent |
| `colors.muted` (`#4A6B8A`) | cream / surface | Helpers; no usar mint como color de párrafo largo |

Mint y coral son acentos (badges, puntos de ronda, error), no tipografía de lectura densa. Tamaño táctil mínimo: `theme.sizes.touch` = 48.

## Cómo probar visualmente

1. Abrir la app y navegar a **Componentes** (`Catalog`).
2. Verificar swatches, tipografía, botones, campos, opciones, progreso y diálogos.

## Fuera de este documento

Flujo online UI visual: OOC-020.13. Assets cartoon pendientes en `BRAND_ASSETS.md`. Informe de cierre: `OOC-020_INTEGRATION_REPORT.md`.
