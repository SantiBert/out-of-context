# Arquitectura del modo presencial

Propuesta aceptada para revisión del diseño y registrada como OOC-015.3. El modo corre en el teléfono, sin backend ni socket. No agrega dependencias y no está implementado. No autoriza empezar OOC-015.6.

El requisito de jugar sin conexión choca con `docs/ARCHITECTURE.md`, que pide una sola implementación de las reglas, y con `docs/MODO_PRESENCIAL.md`, que pedía no copiarlas al cliente. Django no puede importarse desde React Native. No hay un paquete compartido ni un intérprete en el teléfono. El conflicto queda explícito. La copia se limita al núcleo puro ya testeado en el backend.

## Caminos separados

El online sigue igual: pantallas, `mobile/src/services/api/rooms.ts` y `mobile/src/app/RoomConnectionProvider.tsx`. Esas pantallas no calculan roles ni puntos.

El presencial vive en `mobile/src/features/local/`. Las pantallas nuevas solo dibujan y envían acciones. Un módulo de partida aplica la transición y guarda el documento. Otro módulo, `rules`, contiene solo funciones puras: configuración de pilas, mezcla y reparto, clasificación, validación de la elección y puntuación.

`rules` no importa React, navegación, HTTP ni WebSocket. El online no importa `rules`. El servidor sigue siendo la autoridad de la sala.

La excepción queda acotada a las decisiones de `classify_hands`, `score_votes`, `evaluate_team_choice`, `_validate_choice` y el reparto de `deal_round`, escritas otra vez en TypeScript. Los tests de Jest repiten los casos de `backend/games/test/test_roles.py`, `test_scoring.py`, `test_team_evaluation.py` y `test_deck.py`. Si un caso diverge, manda el test de Django. `record_votes`, `close_vote`, el reloj de `voting.py` y los sockets no se portan.

## Reutilización

- `deck_config`, la elección de pilas libres, una carta por jugador y el resto a descarte, en `backend/games/deck.py`. En el cliente solo entra la parte sin ORM.
- Roles y puntos puros: `backend/games/roles.py` y `score_votes` / `evaluate_team_choice` en `backend/games/scoring.py`.
- Nombres: recorte, vacío, máximo 80, sin repetir en la partida.
- Gestos `point`, `fist` y `v`, con las comprobaciones de `submit_vote`.
- Puerto de almacenamiento del estilo de `SessionStorage` en `mobile/src/services/session/guestSession.ts`. La partida local no usa la clave `ooc.guest.session`.
- Stack nativo y parámetros de ruta vacíos, en `mobile/src/navigation/routes.ts`.
- Revelación ya mostrada en el online: nombre, carta, gesto, señalados, puntos y una sola explicación.

## Responsabilidades nuevas

- `features/local/rules`: funciones puras y tests de paridad.
- `features/local/match`: documento de la partida, transiciones y la carta visible. Es lo único que escribe el almacenamiento.
- Pantallas nuevas: nombres, carta privada, conversación sin controles de mano, carga de votos, resultado y marcador.
- Puerto `LocalMatchStorage` con `getItem` y `setItem`.
- El catálogo de 15 o 16 situaciones entra como dato. `backend/cards.json` no es el catálogo oficial: tiene 36 textos y ningún módulo lo carga. Sin una lista confirmada, la partida no reparte.

## Documento de la partida

Lleva versión, jugadores en el orden de alta, las situaciones de las pilas, las pilas ya consumidas, las rondas y la fase de la interfaz.

Cada ronda guarda el número, las cartas repartidas, el descarte, qué jugador mira la carta, si está oculta, los borradores y, solo después de confirmar, los puntos y la explicación. El total es la suma de los puntos de ronda. Los ganadores son quienes empatan en el máximo, y solo cuando ya no hay pilas para otra ronda.

## Estados

Confirmados en el dominio:

- 4–8 jugadores. Pilas: 15 y 3 por ronda, o 16 y 4. Tope: 5 rondas o 4.
- Ronda: `prepared`, `conversation`, `voting`, `finished`.
- Partida: `preparing`, `in_progress`, `finished`. Ningún servicio online pone `in_progress` ni `finished`. El presencial llega a terminada cuando otra ronda caería en `InsufficientPiles`.
- Gestos: `point`, `fist`, `v`.

Nuevos, solo de esta interfaz:

- `setup`: nombres, todavía sin pilas.
- `viewing`: una carta visible u oculta.
- `recording`: borradores editables, antes de confirmar.
- `results`: ronda ya puntuada, antes de la carta siguiente o del marcador final.

Transiciones: `setup` reparte con nombres válidos y catálogo completo. En `viewing`, la carta siguiente aparece después de ocultar la actual. Cuando todos ocultaron, pasa a `conversation`. Una acción explícita abre `recording`. La aplicación no pide manos ni «¡Basta!». Confirmar calcula los puntos y deja la ronda en `results`. Si quedan pilas, la ronda siguiente vuelve a `viewing`. Si no, la partida queda `finished`. Qué pantalla muestra cada fase, y cómo se impide un avance inválido, está en [NAVEGACION_PRESENCIAL.md](NAVEGACION_PRESENCIAL.md).

## Persistencia

La app solo importa `expo-secure-store`, para el token del invitado. La partida no se guarda ahí: ese almacén es el del secreto, y el documento de cartas y votos es más grande que un token. El paquete instalado no documenta un tope de bytes.

`expo-file-system` está en el lockfile porque `expo` lo depende. La app no lo declara. Async Storage y SQLite no están. La persistencia recomendada es un archivo JSON con el módulo que Expo ya trae, detrás de `LocalMatchStorage`, sin agregar un paquete. Declararlo en `mobile/package.json` sería una dependencia nueva y queda fuera de esta propuesta.

Al abrir, un documento de versión 1 que el parser acepta restaura la fase. El token online no se mezcla con este archivo. Qué se muestra si el proceso murió con una carta visible, y cuándo se borra el archivo al terminar, está en [PERSISTENCIA_PRESENCIAL.md](PERSISTENCIA_PRESENCIAL.md). Esa especificación no da por cerrada la carta oculta al reanudar.

## Errores y migraciones

El documento lleva `version: 1`. Un JSON ilegible, un campo de tipo inválido o una versión distinta no se repara: se muestra el error y el archivo queda donde está. No hay migraciones. Una versión futura necesita una función por paso; sin ella no se carga.

No se reparte con menos de 4 o más de 8 nombres, con un nombre vacío, de más de 80 caracteres o repetido, ni con un catálogo que no tenga 15 o 16 situaciones según el tamaño. No se confirma si falta una elección, si señalar no tiene objetivos, apunta al propio jugador o repite un nombre, ni si el puño o la V traen objetivos. No se abre otra ronda con la anterior sin puntuar ni cuando las pilas no alcanzan. Confirmar dos veces no vuelve a sumar.

## Riesgos

La copia en TypeScript puede apartarse de Django. La contención son los tests de paridad y que las pantallas online no llamen a `rules`.

Llamar al backend cumpliría la regla de una sola implementación y no cumple jugar sin conexión. Un paquete compartido o generar el TypeScript desde Python no tiene herramienta en el repositorio.

Siguen pendientes del producto: el catálogo concreto, si el dispositivo debe comprobar `L × 2 > N`, señalar a tres o más personas, el orden visual del marcador y quién confirma. Confirmar con un gesto faltante sigue impedido por `docs/MODO_PRESENCIAL.md` mientras el producto no diga otra cosa.
