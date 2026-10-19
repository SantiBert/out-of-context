# Assets de marca — Out Of Context

**Historia:** OOC-020.3  
**Registro en código:** `mobile/src/theme/brandAssets.ts`  
**Componentes:** `BrandLogo`, `BrandMark`

## 1. Auditoría del estado actual

| Archivo | Origen | Estado |
|---|---|---|
| `mobile/assets/icon.png` | Plantilla Expo | Placeholder; no es arte de producto |
| `mobile/assets/splash-icon.png` | Plantilla Expo | Placeholder; usado en splash hasta entrega |
| `mobile/assets/android-icon-*.png` | Plantilla Expo | Placeholder adaptive |
| `mobile/assets/favicon.png` | Plantilla Expo | Placeholder web |
| `mobile/assets/fonts/Baloo2-*.ttf` + `OFL.txt` | Google Fonts / OFL | Listo (OOC-020.2) |
| `mobile/assets/brand/*` | — | **No existe**; slots documentados abajo |

No hay logo horizontal, mark ni splash de marca originales en el repositorio.  
**Bloqueo:** la entrega de PNG/SVG finales depende del propietario / diseño aprobado. No se inventan recursos finales ni se copian mockups o arte de terceros.

## 2. Requisitos técnicos

### Logo horizontal (`logo-light.png` / `logo-dark.png`)

- Formato: PNG con transparencia
- Tamaño recomendado: ~1200×400 px
- Margen seguro: ~8 % en cada lado
- Light: navy / mint legible sobre crema o blanco
- Dark: cream / mint legible sobre navyDark
- Uso in-app: `BrandLogo` con `resizeMode="contain"`

### Mark / ícono de app (`mark-light.png` / `mark-dark.png`, `icon.png`)

- 1024×1024 px, PNG
- Adaptive Android foreground: 1024×1024 con contenido crítico en zona central (~66 %)
- No debe depender de texto ilegible a 48 dp

### Splash

- Fondo de marca: crema `#F7F3E9` (ya en `app.json`)
- Imagen: PNG `contain` centrada; alternativa full-bleed 1284×2778 si se entrega arte dedicado
- No usar un mockup de pantalla completa como splash de producto

### Variantes

| Variante | Fondo típico | Color de marca |
|---|---|---|
| `light` | cream / white | navy + mint |
| `dark` | navyDark | cream + mint |

## 3. Slots previstos (`mobile/assets/brand/`)

| Clave (`brandAssets`) | Path previsto | Status hoy |
|---|---|---|
| `logoLight` | `assets/brand/logo-light.png` | **missing** (bloqueado) |
| `logoDark` | `assets/brand/logo-dark.png` | **missing** (bloqueado) |
| `markLight` | `assets/brand/mark-light.png` | **missing** (bloqueado) |
| `markDark` | `assets/brand/mark-dark.png` | **missing** (bloqueado) |
| `splash` | `assets/brand/splash.png` (futuro) | **missing**; Expo `splash-icon.png` como puente |
| `appIcon` | `assets/brand/app-icon.png` (futuro) | **missing**; Expo `icon.png` como puente |

Cuando un archivo aprobado se añada al repo: colocar el PNG, añadir `require(...)` en `brandAssets.ts` y pasar `status` a `ready`. Metro no debe `require` paths inexistentes.

## 4. Puente actual (sin arte final)

- **Wordmark tipográfico** “OUT OF CONTEXT” con Baloo 2 + tokens de color (`BrandLogo`).
- **BrandMark** provisional: forma nativa mint/cream + letra “O” (no es el ícono final).
- Splash / adaptive: colores cream; imágenes Expo hasta reemplazo.

## 5. Prohibiciones

- No usar un mockup completo como asset de pantalla.
- No reconstruir ilustraciones complejas con componentes de UI.
- No incorporar imágenes de terceros sin derechos.
- No sustituir faltantes con copias de referencias comerciales u otros juegos.

## 6. Lista de pendientes (bloqueos)

1. Logo horizontal light (PNG aprobado)
2. Logo horizontal dark (PNG aprobado)
3. Mark / app icon 1024 (PNG aprobado)
4. Adaptive foreground / background / monochrome de marca
5. Splash de marca (opcional si basta mark + cream)
6. Favicon de marca

Hasta entonces, Home y Catalog usan wordmark / mark provisional vía componentes.
