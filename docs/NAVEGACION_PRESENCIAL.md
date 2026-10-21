# Navegación del modo presencial

Especificación revisable, registrada como OOC-015.5. No agrega rutas, pantallas ni librerías. El flujo de juego está en [MODO_PRESENCIAL.md](MODO_PRESENCIAL.md), la forma del documento en [ARQUITECTURA_PRESENCIAL.md](ARQUITECTURA_PRESENCIAL.md) y el ciclo de vida en [PERSISTENCIA_PRESENCIAL.md](PERSISTENCIA_PRESENCIAL.md). La épica es OOC-015 en `docs/BACKLOG.md`.

## Qué se reutiliza

Hay un solo `NavigationContainer` y el stack de `mobile/src/navigation/AppNavigator.tsx`. Los parámetros de ruta siguen vacíos, como en `mobile/src/navigation/routes.ts`: la carta, el voto y el nombre no viajan en la ruta. `useAppNavigation`, `Button`, `Heading`, `HelperText` y `screenStyles` se pueden usar cuando existan las pantallas.

No se reutilizan `SecretCardScreen`, `ConversationScreen`, `VotingScreen`, `ResultsScreen`, `ScoreboardScreen` ni `LobbyScreen`: leen el token y el socket de un solo miembro. `ScreenPlaceholder` se eliminó en OOC-020.12 (no tenía consumidores). `GuestSessionProvider` y `RoomConnectionProvider` siguen envolviendo el navegador para el online. Las pantallas locales no se suscriben a ese socket ni leen `ooc.guest.session`.

## Pantallas

Cada fase de la interfaz tiene una pantalla. Si la ruta no coincide con la fase del documento, se reemplaza la ruta por la de esa fase y no se dibuja la carta ni el voto de la ruta equivocada. El cambio de fase deja una sola ruta en el stack: el atrás no puede volver a la carta del jugador anterior.

- Inicio, la `Home` ya existente. Sin archivo local ofrece la entrada al presencial, además de crear sala, unirse y componentes. El rótulo de esa entrada no está definido.
- Nombres, fase `setup`. Anota de 4 a 8 nombres en el orden guardado. No muestra cartas ni reparte hasta que el módulo de partida acepte la lista. El mazo es `backend/cards.json`.
- Carta, fase `viewing`. Pantalla única: nombre, “Pasa el teléfono a {nombre}”, Continuar y sheet deslizante. Número y texto solo con el sheet abierto. Continuar exige haber revelado (`seen`) y cubre al avanzar. Back UI vuelve al jugador anterior (cubierto). Al ir a segundo plano la carta se cubre sin avanzar. No muestra descarte, rol ni otra mano.
- Mesa, fase `conversation`. Sin carta en pantalla. Una acción explícita abre la carga. No hay manos, «¡Basta!» ni cuenta regresiva. OOC-010 no define esta pantalla: la mesa usa esa fase, ya escrita aquí y en la arquitectura presencial.
- Carga, fase `recording`. Al entrar pide Continuar antes de mostrar gestos anotados. Borradores editables de quien ya tiene una elección aceptada. Confirmar solo si el módulo acepta todas las elecciones juntas. No confirma dos veces. No muestra cartas ni roles.
- Resultado, fase `results`. Una fila por persona: rol (equipo/impostor), carta, gesto, señalados, puntos de la ronda y total, más una explicación. Clasificación ordenada por puntos. No vuelve a puntuar.
- Marcador final, fase `finished`. Misma pantalla con clasificación por puntos y quienes empatan en el máximo. Ofrece «Volver a jugar» con las mismas personas y «Cambiar jugadores» para editar la lista en Nombres. No hay revancha reglamentaria ni ronda siguiente aparte de esas salidas.
- Aviso de archivo inválido. No es una fase. Explica que no se puede reanudar. El archivo sigue hasta descartarlo. No reparte una partida encima.

## Transiciones válidas

```mermaid
flowchart TD
  home[Inicio]
  setup[Nombres]
  card[Carta]
  table[Mesa]
  record[Carga]
  results[Resultado]
  score[Marcador]
  invalid[ArchivoInvalido]
  home -->|sin partida| setup
  home -->|archivo invalido| invalid
  invalid -->|descartar confirmado| home
  setup -->|reparto aceptado| card
  card -->|Continuar tras ver y queda otro| card
  card -->|todos vieron Continuar| table
  table -->|abrir carga| record
  record -->|confirmar aceptado| results
  results -->|quedan pilas| card
  results -->|no quedan pilas| score
  score -->|salir del marcador| home
  card -->|reiniciar confirmado| card
  table -->|reiniciar confirmado| card
  record -->|reiniciar confirmado| card
  results -->|reiniciar confirmado| card
  score -->|volver a jugar confirmado| card
  score -->|cambiar jugadores confirmado| setup
  setup -->|abandonar confirmado| home
  card -->|abandonar confirmado| home
  table -->|abandonar confirmado| home
  record -->|abandonar confirmado| home
  results -->|abandonar confirmado| home
  score -->|abandonar confirmado| home
```

Reiniciar, durante la partida y tras confirmar, guarda una partida nueva con los mismos nombres y abre Carta cubierta. En el marcador final, «Volver a jugar» hace lo mismo y «Cambiar jugadores» reemplaza el documento por un setup con esos nombres, editable en Nombres. Abandonar, tras confirmar, borra el documento y vuelve a Inicio. Cancelar deja la fase actual. Inicio sin confirmar no abandona.

La pantalla no ofrece saltar de nombres a mesa, de carta a carga, de mesa a resultado ni de carga a la carta del siguiente. Tampoco abrir la ronda siguiente con la anterior sin puntuar, ni abrirla si no alcanzan las pilas. Continuar no deja la carta visible al pasar. El orden de la pasada es el orden guardado de los nombres. El reglamento no confirma que ese sea el orden de la mesa.

Confirmar una lista válida sortea 15 pilas si hay 4 a 6 nombres y 16 si hay 7 u 8, desde las 36 de `backend/cards.json`. Reparte la primera ronda y abre Carta en `viewing`. La carta queda cubierta: el número y el texto aparecen solo al abrir el sheet.

## Al iniciar

Sin archivo, se abre Inicio. El online no se entera.

Con versión 1 aceptada, se abre la pantalla de la fase guardada. No se reparte de nuevo ni se vuelven a calcular puntos ya confirmados.

Con un archivo ilegible, de otra versión o incoherente, se muestra el aviso y no se entra a una fase. Una sesión de invitado que ya exista no se borra ni se usa para esta partida.

## Confirmación

No hay deshacer. Piden confirmación antes de borrar progreso aceptado: abandonar la partida activa, reiniciar la partida activa, volver a jugar desde el marcador, cambiar jugadores desde el marcador, y descartar un archivo inválido. Reiniciar y volver a jugar conservan los nombres, reparte otra vez y dejan una sola ruta en Carta. Cambiar jugadores deja una sola ruta en Nombres.

No piden este diálogo: ocultar la carta, abrir la carga, confirmar el voto y pasar a la ronda siguiente. Salir del marcador final borra el archivo según la recomendación ya escrita. Un diálogo extra ahí no está decidido.

Inicio y el atrás del sistema, con una partida activa, no están decididos. Si solo vuelven a Inicio y dejan el archivo, la partida se reanuda al abrir de nuevo y no hace falta confirmación. Si equivalen a abandonar, borran el archivo y sí la piden. Esta especificación no elige una de las dos.

## Vacíos, errores y recuperación

Con la lista de nombres vacía se puede anotar y no se reparte. Con menos de 4, más de 8, un nombre vacío, de más de 80 caracteres o repetido, el módulo lo rechaza y la pantalla sigue en nombres. Si el archivo de 36 situaciones no alcanza para las 15 o 16 pilas, no se reparte y se queda en nombres. La carta oculta no muestra número ni texto. La mesa no muestra manos. Si en la carga falta una elección válida, no se confirma. Una elección inválida no entra al archivo. Si la escritura se corta, queda el documento anterior. Ante un archivo inválido, el aviso permite descartarlo después de confirmar, y eso vuelve a Inicio. El resultado y el marcador no se recalculan. Este modo no tiene reintento de red.

## Privacidad

La carta de otro jugador no se dibuja en nombres, carta, mesa ni durante el cambio de ruta. En resultado y marcador final solo entra la ronda ya revelada. Al reanudar `viewing` la pasada vuelve a empezar oculta. Al ir a segundo plano con la carta visible se cubre sin pasar al siguiente. Al reanudar la carga, Continuar precede a los gestos anotados; la carga no muestra cartas ni roles. Si quien ya ocultó su carta puede verla otra vez sigue pendiente.

## Diferencias con el online

El online va de Inicio a crear o unirse, lobby, carta, conversación, votación, resultados y marcador, empujando rutas según el servidor. Cada teléfono es un jugador. «Inicio» vacía el stack y no borra la sala. El presencial no tiene código, lobby, mano ni cuenta regresiva. Una sola lista de nombres pasa por carta, mesa y carga. La fase local manda sobre la ruta. El online puede seguir existiendo en la misma aplicación. Sus pantallas no muestran el documento local.

## Pendiente

- Rótulos de la entrada presencial, ocultar, abrir carga, ronda siguiente y descartar. Reiniciar usa «Reiniciar partida». En el marcador, «Volver a jugar» y «Cambiar jugadores». Abandonar usa «Abandonar partida».
- Si Inicio o el atrás abandonan o solo dejan el archivo.
- Si salir del marcador final pide diálogo. Volver a jugar y cambiar jugadores ya lo piden.
- Volver a ver una carta ya oculta.
- Si al abrir con partida válida se puede llegar al online sin abandonar. La persistencia abre la fase guardada.
- Si el socket de una sesión de invitado ya abierta debe quedar quieto mientras se mira la partida local. Las pantallas locales no lo usan.
- Siguen abiertos, y esta navegación no los cierra: el catálogo, comprobar `L × 2 > N`, señalar a tres o más, quién confirma y el orden de la mesa. El marcador se ordena por puntos (empate estable por orden de nombres).
