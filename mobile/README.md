# Cliente móvil

Aplicación Android de Out Of Context. El proyecto usa Expo, React Native y TypeScript. El gestor de paquetes es npm. La navegación es React Navigation con un stack nativo, declarada en `src/navigation/`. No usa Expo Router. La pantalla inicial es Inicio.

Las dependencias y sus versiones están en `package.json` y `package-lock.json`.

## Requisitos

- Node.js y npm.
- Para la compilación de desarrollo Android: JDK y Android SDK. Ese entorno no está disponible en la máquina donde se inicializó el proyecto, así que `npm run android` no se ejecutó.

## Comandos

Desde `mobile/`:

```powershell
npm install
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run format:check
npm run format
npm start
npm run android
```

- `npm test` ejecuta Jest. No abre el backend ni un emulador. No incluye `integration/`.
- `npm run test:integration` llama al backend local en `http://127.0.0.1:8000`. Hace falta que Docker esté sirviendo esa API. No forma parte del CI.
- `npm run lint` ejecuta ESLint con la configuración de Expo y TypeScript.
- `npm run typecheck` comprueba los tipos con TypeScript.
- `npm run format:check` comprueba el formato con Prettier sin modificar archivos.
- `npm run format` aplica el formato de Prettier.
- `npm start` inicia Metro.
- `npm run android` ejecuta `expo run:android`, genera el proyecto nativo y compila el development build. Requiere JDK y Android SDK.

`mobile/android/` y `mobile/ios/` se generan con prebuild y no se versionan.

## Configuración

La URL del backend se lee con `getApiBaseUrl()` en `src/config/env.ts`, desde `EXPO_PUBLIC_API_URL`. Expo solo incorpora al bundle las variables que empiezan por `EXPO_PUBLIC_`. No pongas ahí la clave de Django ni la contraseña de PostgreSQL: esas variables viven en el `.env` de la raíz y no entran en la aplicación.

Desde `mobile/`:

```powershell
Copy-Item .env.example .env
```

Si la variable falta o no es una URL `http` o `https`, el error pide copiar el ejemplo y reiniciar Metro. El valor de ejemplo, `http://10.0.2.2:8000`, sirve para el emulador Android.

- Misma máquina: `http://127.0.0.1:8000`.
- Emulador Android: `http://10.0.2.2:8000`. Apunta al `127.0.0.1` del equipo de desarrollo.
- Dispositivo físico: `http://<IP-LAN-del-equipo>:8000`, en la misma red. Django debe ejecutarse con `runserver 0.0.0.0:8000` y esa IP debe estar en `DJANGO_ALLOWED_HOSTS`. `localhost` en el teléfono no es el equipo de desarrollo.

## Convenciones

### Nombres

- Los componentes y sus archivos usan PascalCase: `HomeScreen` en `src/screens/HomeScreen.tsx`.
- Las funciones, las variables y los hooks usan camelCase. Los hooks empiezan por `use`.
- Los tipos y las interfaces usan PascalCase.
- Las constantes exportadas de un módulo usan camelCase, como `appTitle`.

### Organización

Las carpetas siguen la estructura de `docs/ARCHITECTURE.md` y se crean solo cuando hay código que las ocupe:

- `src/app/`: entrada de la aplicación y proveedores. `GuestSessionProvider` guarda el nombre visible, el código de la sala y el token.
- `src/navigation/`: navegación.
- `src/screens/`: pantallas.
- `src/components/`: componentes reutilizables.
- `src/features/`: interfaz, estado y lógica de una funcionalidad.
- `src/services/api/`: `createRoom` y `joinRoom` llaman a `POST /api/rooms/` y `POST /api/rooms/{code}/members/`. El cuerpo es solo `{ name }`.
- `src/services/realtime/`: el socket de la sala vive en `RoomConnectionProvider`. Las pantallas se suscriben; no abren otro.
- `src/services/session/`: lectura y escritura de la sesión de invitado. El token se persiste con `expo-secure-store`.
- `src/hooks/`: hooks del cliente. `useAppNavigation` tipa el stack.
- `src/config/`: configuración pública del cliente, como la URL del backend.
- `src/types/`: tipos compartidos del cliente. Las rutas se reexportan desde aquí.
- `src/utils/`: utilidades pequeñas.
- `src/theme/`: tokens de color, tipografía, espacio, radio, tamaño y elevación.

### Componentes

Los componentes de `src/components/` no llaman a la red ni aplican reglas de juego. Las pantallas los componen.

- `Button`: `variant` `primary` o `secondary`. `disabled` y `loading` bloquean el toque.
- `TextField`: `label`, `value`, `onChangeText`. `error` y `disabled` son opcionales.
- `Heading` y `HelperText`: título y texto auxiliar.
- `ContentCard`: contenedor con la elevación del tema.
- `StatusBadge`: `tone` `neutral`, `success`, `warning` o `danger`, siempre con texto.
- `LoadingIndicator`: spinner y la etiqueta `Cargando`.
- `Message`: `tone` `error` o `warning`.
- `EmptyState`: `title` y `message`.
- `ConfirmAction`: diálogo con confirmar y cancelar.

Inicio ofrece Crear sala, Unirse y el catálogo Componentes. El catálogo no forma parte de la partida. Los tokens visuales viven en `src/theme/theme.ts`.

Crear sala y Unirse piden el nombre. Unirse también pide el código: el cliente lo recorta y lo pasa a mayúsculas, y el servidor lo acepta o lo rechaza. El nombre se recorta, no puede quedar vacío y admite como máximo 80 caracteres. Esas llamadas son `POST /api/rooms/` y `POST /api/rooms/{code}/members/`, con el cuerpo `{"name"}`. Una segunda pulsación mientras la primera no terminó no envía otra solicitud. Si la respuesta no trae `token` o falla la red, la pantalla muestra el mensaje y el botón permite reintentar. `invalid_room`, `room_not_found`, `room_closed`, `room_full` y `duplicate_member` muestran el `detail` del servidor. Cualquier otro código muestra «No se pudo completar la operación.». El cliente no decide si la sala está llena, cerrada o si el código existe.

El token de esa respuesta se guarda en el almacén seguro y no entra en los parámetros de navegación ni en la consola. No hay cuenta de usuario ni ruta para salir.

El lobby muestra el código de invitación, el anfitrión y los participantes del `GET /api/rooms/{code}/`. El socket es `ws://<host>/ws/rooms/<code>/?token=`, derivado de `EXPO_PUBLIC_API_URL`. Consume `room.snapshot`, `room.player_joined`, `room.player_left`, `room.state_changed`, `game.started` y `connection.error`. Esos eventos de sala sustituyen la lista; no se añaden nombres. Muestra conectando, en vivo, reconectando o el error. Iniciar, `POST /api/rooms/{code}/start/?token=`, aparece solo si el nombre de la sesión es `host` y espera el `200` antes de abrir la carta secreta. `game.started` también abre esa pantalla. No se muestran cartas, roles ni votos.

La carta secreta pide `GET /api/rooms/{code}/card/?token=` y `GET /api/rooms/{code}/round/?token=`. Muestra el número y el texto de esa carta, ligados al `number` de la ronda. De la ronda solo guarda `number` y `status`. El mismo socket escucha `round.phase_changed`: si cambia el número, o la fase deja de ser `conversation` o `voting`, borra la carta y vuelve a pedir los dos GET. `round.revealed` no se usa. `card_unavailable` y `round_unavailable` muestran el `detail` y permiten reintentar, igual que un `401` o un fallo de red. Continuar abre Conversación solo cuando `status` es `conversation`, sin parámetros. La carta no se escribe en la consola ni en la navegación. No hay reparto en el cliente.

La conversación muestra la ronda y los participantes. Las manos salen de `ready` en `GET /api/rooms/{code}/round/?token=`. El socket envía `round.raise_hand` y `round.basta` con el payload vacío, y escucha `round.hand_raised`, `round.phase_changed` y `connection.error`. Una mano repetida no duplica el nombre. Levantar la mano queda deshabilitado cuando ese nombre ya está en `ready`. «¡Basta!» se ofrece mientras `status` es `conversation`; el cliente no calcula la mayoría. `not_ready` muestra el `detail` y deja la pantalla en su sitio. `voting` abre Votación, sin parámetros. No hay chat, ni bajar la mano, ni cartas ni roles.

La votación envía `POST /api/rooms/{code}/vote/?token=` con `gesture` y `targets`: señalar a otros participantes, el puño o la V. No hay rol en el cuerpo ni en la pantalla. La cuenta muestra `vote_mark` del `GET /api/rooms/{code}/round/?token=` o `mark` de `round.countdown`. No usa el reloj del teléfono. Una marca mayor no reabre la cuenta. Solo un `200` confirma la elección, con los `targets` devueltos. Si la red falla, la elección queda en duda y el reintento manda el mismo cuerpo. Un `409` muestra el `detail` y no sustituye la papeleta confirmada. Al llegar a 0 no se envía un voto vacío. `finished` abre Resultados, sin parámetros. `round.revealed` no se muestra.

Los resultados piden `GET /api/rooms/{code}/results/?token=` y escuchan `round.revealed`. Muestran, por jugador, el nombre, la carta, el gesto, los señalados, los puntos y «Reconocido por» o «Señalado por». No hay línea de rol ni una suma distinta de `points`. `results_unavailable` deja la lista vacía y permite reintentar. Un evento repetido sustituye las filas. Continuar abre Marcador solo cuando esa lista ya llegó. La ronda `finished` no se muestra como partida terminada.

El marcador pide `GET /api/rooms/{code}/score/?token=`. Muestra `name` y `points` en el orden recibido. `preparing` e `in_progress` son partida en curso y no enseñan ganadores. `finished` muestra los `winners` que trajo el backend. `round.revealed` y `round.phase_changed` con `finished` vuelven a pedir el GET. Una respuesta repetida sustituye la lista. No hay ronda nueva ni revancha.

La sesión abre un solo socket. Tras un corte hay como máximo 3 reintentos, a 1 s, 2 s y 4 s. Si uno abre, el contador vuelve a cero. `unauthorized` y `room_not_found` se detienen y muestran el `detail`. Al quedar en vivo se pide otra vez el `GET` de la sala y el de la pantalla visible. Un mensaje de una conexión anterior no reemplaza ese estado, y la fase no retrocede. El inicio, la mano, ¡Basta! y el voto no se reenvían solos. ¡Basta! sin confirmar queda en duda, con Reintentar. El voto dudoso solo sale de nuevo si la persona lo pulsa y la ronda sigue en `voting`.

Las pruebas viven en `mobile/__tests__/` o junto al módulo que cubren. `npm test` no monta pantallas: no hay React Native Testing Library, Detox, Maestro ni Playwright. Un runner nativo exigiría el emulador, y `npm run android` no está disponible en este entorno.

Cada tramo del flujo tiene su archivo, y `__tests__/flow.test.ts` los recorre juntos con contratos simulados:

- Inicio e identidad: `__tests__/guestSession.test.ts` y `__tests__/App.test.tsx`.
- Crear sala y unirse: `__tests__/guestSession.test.ts`.
- Lobby y participantes: `__tests__/lobby.test.ts`.
- Carta secreta: `__tests__/secretCard.test.ts`.
- Conversación: `__tests__/conversation.test.ts`.
- Votación: `__tests__/voting.test.ts`.
- Resultados: `__tests__/results.test.ts`.
- Marcador: `__tests__/scoreboard.test.ts`.
- Errores y reconexión: `__tests__/connection.test.ts` y los de cada pantalla.
- Recorrido encadenado: `__tests__/flow.test.ts`.

`npm run test:integration` crea una sala real, une a cuatro jugadores, inicia y comprueba la carta ausente, la ronda ausente, el marcador en `preparing` sin ganadores, el `401`, el `404` y que reconectar el socket no duplica participantes. El backend local no reparte: `begin_conversation` no tiene ruta, así que esa prueba no llega a conversación, voto, revelación ni partida `finished`. Esas fases quedan en el recorrido simulado.

### Imports

- Primero los paquetes externos. Después, separadas por una línea en blanco, las importaciones del proyecto.
- Las pantallas y los componentes se exportan con nombre.
- `export default` queda reservado a `App.tsx`, porque Expo registra ese módulo como raíz.
- Las importaciones del proyecto son relativas. No hay alias de rutas.
