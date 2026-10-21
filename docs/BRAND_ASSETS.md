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
| `mobile/assets/brand/*` | — | Slots globales aún missing (abajo) |
| `mobile/assets/brand/inicio/*` | Arte Home | **Listo** (logo, people, background, iconos CTA) |

Slots globales (logo horizontal dual, mark, splash, app icon) siguen pendientes.  
Home usa el registro `homeAssets.ts` con PNG en `assets/brand/inicio/`. No se usan mockups de `docs/art/` ni PNG de botones completos como UI.

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

### Assets de Home (`assets/brand/inicio/` → `homeAssets.ts`)

| Clave | Path | Status | Uso |
|---|---|---|---|
| `homeLogo` | `assets/brand/inicio/logo.png` | **ready** | Logo sticker en Home |
| `homePeople` | `assets/brand/inicio/people.png` | **ready** | Hero de personajes |
| `homeBackground` | `assets/brand/inicio/background.png` | **ready** | Decoración (no pantalla completa) |
| `homePlayIcon` | `assets/brand/inicio/playicon.png` | **ready** | Icono CTA nativo Jugar |
| `homeBookIcon` | `assets/brand/inicio/book.png` | **ready** | Icono CTA nativo Cómo se juega |

**No registrar:** `playbutton.png`, `howtoplay.png` (referencia de diseño; CTAs son nativos).

### Assets de LocalCard (`assets/brand/carta/` — pendiente)

| Clave prevista | Path previsto | Status | Uso |
|---|---|---|---|
| `cardHero` | `assets/brand/carta/hero.png` | **missing** | Ilustración del personaje en el hero del reparto privado (mockup `docs/art/cartasdejugador.png`) |

Hasta `ready`, LocalCard usa splash mint nativo. No usar el mockup como fondo de pantalla.

## 4. Puente actual (sin arte final global)

- **Home:** logo + people + background + iconos de CTA vía `homeAssets` / `HomeCtaButton`.
- **LocalCard:** decoración mint; personaje `cardHero` pendiente.
- **Otras pantallas:** wordmark tipográfico Baloo 2 (`BrandLogo`) y mark provisional (`BrandMark`) hasta slots globales `ready`.
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
7. Hero de LocalCard (`assets/brand/carta/hero.png`)

Hasta entonces, pantallas fuera de Home usan wordmark / mark provisional vía componentes. Home ya consume `inicio/`. LocalCard espera `cardHero`.
