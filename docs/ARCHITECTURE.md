# Out Of Context — Architecture

**Estado:** Arquitectura base propuesta  
**Proyecto:** Out Of Context  
**Última actualización:** 2026-10-12

## 1. Objetivo

Definir una arquitectura mantenible, segura y escalable para Out Of Context, un juego multijugador basado en conversación, identificación de equipos, impostores y votación simultánea.

El sistema debe permitir crear partidas, incorporar jugadores, gestionar rondas, repartir cartas secretas, sincronizar estados, procesar votos, calcular puntuaciones y mostrar resultados.

La arquitectura prioriza:

- Integridad de las reglas del juego.
- Protección de la información oculta.
- Separación de responsabilidades.
- Comunicación confiable entre clientes.
- Facilidad de pruebas y mantenimiento.
- Desarrollo local reproducible.
- Evolución incremental del producto.

## 2. Stack tecnológico

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + TypeScript |
| Backend | Python + Django |
| API HTTP | Django REST Framework |
| Base de datos | PostgreSQL |
| Comunicación en tiempo real | Django Channels + WebSockets |
| Infraestructura local | Docker Compose |
| Contratos de comunicación | Documentación y definiciones compartidas en `contracts/` |
| Control de versiones | Git |

### Decisiones pendientes

Las siguientes decisiones deben confirmarse antes de que condicionen la implementación:

- Biblioteca de navegación.
- Estrategia de gestión de estado del cliente.
- Mecanismo de autenticación.
- Capa de almacenamiento del estado temporal de las partidas.
- Backend de canales y estrategia de despliegue de Django Channels.
- Proveedor de alojamiento y distribución de la aplicación.

No introducir dependencias importantes para estas decisiones sin revisar el repositorio y documentar el motivo de la elección.

### Inicialización del cliente móvil

**Estado:** decisión aprobada. El cliente se inicializa con Expo, plantilla TypeScript, development builds y prebuild. El gestor de paquetes del cliente es npm.

El cliente hablará con Django Channels mediante el API WebSocket de JavaScript. Expo y React Native Community CLI pueden usar ese API sin un módulo nativo, así que el tiempo real no decide la herramienta.

| Criterio | Expo | React Native Community CLI |
|---|---|---|
| Desarrollo Android | `prebuild` genera el proyecto Android y el flujo de Expo lo ejecuta. Hacen falta JDK, Android SDK y un emulador o dispositivo. | El directorio `android/` y Gradle entran al repositorio desde el primer día. También hacen falta JDK, Android SDK y un emulador o dispositivo. |
| Configuración nativa | Permisos, red y módulos nativos habituales se cubren con config plugins y un development build. | La configuración se edita en el proyecto Android. |
| Dependencias | El SDK de Expo alinea React Native y las bibliotecas compatibles. | Cada biblioteca se versiona por separado. |
| Builds | La compilación local usa Gradle después de `prebuild`. EAS Build puede usarse y no es obligatorio. | La compilación local usa Gradle desde el inicio. |
| Pruebas | Jest y React Native Testing Library cubren el cliente TypeScript. | Jest y React Native Testing Library cubren el cliente TypeScript. |
| Mantenimiento | El producto actual son pantallas, HTTP y tiempo real. El proyecto nativo se regenera mientras no haya una personalización nativa propia. | El equipo mantiene Gradle y el proyecto Android aunque todavía no exista un módulo nativo propio. |
| Complejidad operativa | Menor mientras la aplicación no requiera conservar un proyecto nativo modificado a mano. | Mayor desde el primer día, por el mantenimiento del proyecto Android. |

Expo encaja con el alcance actual: una aplicación Android nueva, sin código nativo previo y sin un módulo nativo identificado. El acceso nativo posterior sigue disponible con config plugins, `expo prebuild` y un development build.

**Consecuencias de la decisión aprobada:**

- Se utiliza únicamente Expo.
- La inicialización usa la plantilla TypeScript dentro de `mobile/`.
- El gestor de paquetes del cliente es npm. Se conserva `package-lock.json`.
- El directorio `android/` se genera con `prebuild`. Se mantiene a mano solo cuando una necesidad nativa posterior lo requiera. Los directorios generados `mobile/android/` y `mobile/ios/` no se versionan.
- La navegación, el estado del cliente y la autenticación siguen abiertos.
- El entorno de desarrollo continuo es un development build. Expo Go queda limitado a las dependencias incluidas en su runtime.
- EAS Build no forma parte del entorno local obligatorio.

## 3. Estructura del monorepo

La estructura objetivo es:

    .
    ├── mobile/
    │   ├── src/
    │   ├── package.json
    │   └── ...
    ├── backend/
    │   ├── manage.py
    │   ├── config/
    │   ├── apps/
    │   ├── tests/
    │   └── requirements/
    ├── contracts/
    │   ├── api/
    │   └── realtime/
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── GAME_DESIGN_DOCUMENT.md
    │   └── BACKLOG.md
    ├── infra/
    │   └── docker/
    ├── .cursor/
    │   └── skills/
    ├── .env.example
    ├── .gitignore
    ├── docker-compose.yml
    └── README.md

La estructura es una referencia arquitectónica, no una instrucción para recrear directorios existentes ni para mover archivos sin necesidad.

### Responsabilidades por directorio

**`mobile/`**

Contiene la aplicación React Native, la interfaz, la navegación, el estado local, los clientes HTTP y la integración WebSocket.

**`backend/`**

Contiene la aplicación Django, las reglas de negocio, las API, la autorización, la gestión de partidas y la persistencia.

**`contracts/`**

Documenta los contratos HTTP y los eventos en tiempo real compartidos entre el cliente y el servidor.

**`docs/`**

Contiene la arquitectura, las reglas del juego, el backlog y las decisiones técnicas relevantes.

**`infra/`**

Contiene configuraciones de infraestructura, contenedores y recursos de desarrollo o despliegue.

**`.cursor/skills/`**

Contiene las instrucciones especializadas utilizadas por Cursor para trabajar con las distintas áreas del proyecto.

## 4. Arquitectura de alto nivel

El sistema sigue una arquitectura cliente-servidor.

    Aplicación React Native
             |
             | HTTPS / JSON
             v
       Django REST API
             |
             v
       Capa de servicios
             |
             v
         PostgreSQL

    Aplicación React Native
             |
             | WebSocket
             v
      Django Channels
             |
             v
       Capa de servicios
             |
             v
         PostgreSQL

HTTP y WebSockets deben utilizar las mismas reglas de autorización y las mismas operaciones de negocio. No deben existir dos implementaciones independientes de las reglas del juego.

La aplicación móvil nunca se conecta directamente a PostgreSQL.

### Responsabilidad del cliente

El cliente móvil se encarga de:

- Presentar las pantallas y los controles.
- Permitir crear o unirse a salas.
- Mostrar los jugadores y el estado público de la partida.
- Mostrar la carta secreta del jugador autenticado cuando el servidor lo autorice.
- Enviar acciones del usuario.
- Recibir actualizaciones del estado.
- Presentar errores, estados de carga y resultados.
- Recuperar el estado visible tras una reconexión.

El cliente no es la autoridad para determinar roles, validar votos, avanzar fases ni calcular puntuaciones oficiales.

### Responsabilidad del backend

El backend se encarga de:

- Validar las operaciones solicitadas.
- Identificar y autorizar al jugador que realiza cada acción.
- Administrar salas y participantes.
- Gestionar el ciclo de vida de las partidas.
- Seleccionar y consumir pilas de cartas.
- Repartir cartas.
- Mantener la información secreta.
- Validar las fases y transiciones.
- Registrar votos.
- Calcular puntuaciones.
- Persistir los datos necesarios.
- Publicar actualizaciones a los clientes autorizados.

### Responsabilidad de PostgreSQL

PostgreSQL almacena los datos persistentes del sistema, sujetos al modelo de datos aprobado.

El acceso se realiza exclusivamente desde el backend mediante las herramientas de persistencia de Django.

## 5. Organización del backend

Se recomienda separar el backend por dominios funcionales, evitando una aplicación monolítica donde toda la lógica quede concentrada en las vistas.

La organización inicial puede incluir:

- `accounts`: identidad y autenticación, cuando estén definidas.
- `rooms`: salas, invitaciones y participantes.
- `games`: partidas, rondas y ciclo de vida.
- `cards`: catálogo de cartas, pilas y reparto.
- `scoring`: evaluación de votos y cálculo de puntuaciones.

Estos nombres son una propuesta. Deben adaptarse a la estructura real del backend y no es necesario crear todas las aplicaciones antes de que tengan una responsabilidad concreta.

### Capas recomendadas

**API y consumidores**

Las vistas de Django REST Framework y los consumidores de Django Channels reciben las solicitudes, verifican los permisos y delegan las operaciones.

**Servicios de dominio**

Implementan operaciones de negocio como iniciar una ronda, repartir cartas, cerrar una votación o finalizar una partida.

**Modelos y persistencia**

Representan los datos persistentes y sus restricciones. Las migraciones de Django mantienen el esquema de PostgreSQL.

**Serialización y contratos**

Validan los datos recibidos y definen qué información puede salir del servidor.

Las vistas y los consumidores no deben contener implementaciones duplicadas de las reglas del juego.

## 6. Organización de la aplicación móvil

La aplicación móvil se implementa con React Native y TypeScript.

Como organización inicial se propone:

    mobile/src/
    ├── app/
    ├── navigation/
    ├── screens/
    ├── components/
    ├── features/
    ├── services/
    │   ├── api/
    │   └── realtime/
    ├── theme/
    ├── types/
    └── utils/

La estructura puede ajustarse según la inicialización real del proyecto.

### Principios

- Usar componentes funcionales y hooks.
- Mantener los tipos TypeScript explícitos.
- Separar presentación, comunicación y lógica de dominio.
- Evitar duplicar las reglas autoritativas del backend.
- Gestionar los errores de red de forma explícita.
- Limpiar conexiones y suscripciones cuando corresponda.
- Mantener la configuración por entorno fuera del código sensible.
- Evitar abstracciones y dependencias innecesarias.

El estado del servidor y el estado de la interfaz deben distinguirse. Una acción enviada no equivale a una acción confirmada.

## 7. Modelo conceptual del dominio

El siguiente modelo es conceptual. No constituye todavía un esquema definitivo de modelos Django.

### Room

La sala es una entidad distinta de la partida. `Room` guarda un identificador interno y un código de invitación único, y nace en `waiting`. No es un `Game` en `preparing`. Crear una sala no reparte cartas ni abre una ronda.

### Player / RoomParticipant

`RoomMember` es quien está en la sala. Se identifica por un nombre visible, único dentro de esa sala. El creador es el único anfitrión. `Participant` sigue siendo el jugador de una partida y no se reutiliza aquí porque exige un `Game`. No hay `User` ni login. Django incluye `auth`, pero el juego no lo usa.

### Game

Representa una partida completa.

Mantiene el estado general, las rondas y los resultados acumulados.

### Round

Representa una ronda dentro de una partida.

Debe identificar la fase actual, las pilas consumidas y los datos necesarios para reconstruir el estado autorizado.

### Card

Representa un tipo de carta del juego. Cada tipo tiene las copias definidas por las reglas.

### CardPile

Representa una pila de cartas que participa en la selección de una ronda. Las pilas consumidas no deben volver a seleccionarse durante esa partida.

### Vote

Representa el gesto de voto de un jugador en una ronda.

Debe asociarse con la ronda y el jugador que lo emitió, y evitar duplicados que alteren el resultado.

### Score / ScoreEvent

Representa los puntos obtenidos por un jugador.

Puede persistirse como puntuación acumulada, eventos de puntuación o una combinación de ambos, según las necesidades de auditoría y consistencia.

La estrategia definitiva debe evitar que una misma ronda puntúe dos veces.

## 8. Ciclo de vida de una partida

**Estado:** decisión aprobada para los estados de `Game` y `Round`, para crear una sala en `waiting`, para unirse o salir mientras espera, para consultar ese estado y para que el anfitrión inicie la partida. La entrada con la partida ya iniciada, el resto de operaciones exclusivas del anfitrión y la autenticación no están aprobadas.

La lista anterior de diez fases mezclaba la sala con la ronda. Los nombres que usa el dominio son los de los modelos. El servidor decide las transiciones. Una operación repetida no duplica efectos. Una vista pública no incluye la carta ni el rol.

### Partida

`Game` tiene tres estados:

| Estado | Significado |
|---|---|
| `preparing` | La partida admite participantes y todavía no está en juego. Puede tener menos de 4 jugadores. |
| `in_progress` | La partida está en juego. |
| `finished` | La partida ha terminado. |

En `preparing` no se admite un noveno participante. `in_progress` y `finished` exigen entre 4 y 8. El nombre de cada participante es único dentro de la partida.

`start_game` crea la partida en `preparing` y no la pasa a `in_progress`. Ningún servicio pasa todavía la partida a `in_progress` o a `finished`. El reglamento dice que, después de puntuar, se prepara otra ronda si quedan pilas y, si no quedan, la partida termina. Gana quien tenga más puntos. Si varios comparten ese máximo, comparten la victoria. `start_round` rechaza otra ronda cuando no hay pilas suficientes, pero no marca `finished` ni elige ganador. Eso corresponde a OOC-011.

### Ronda

`Round` tiene cuatro estados:

| Estado | Significado |
|---|---|
| `prepared` | Las pilas de la ronda ya se eligieron y todavía no se repartieron. |
| `conversation` | Cada participante tiene una carta. |
| `voting` | `call_basta` deja la ronda aquí, todavía sin votos. Los gestos no salen por el socket. |
| `finished` | `close_vote` la deja aquí después de guardar los premios. |

`start_round` bloquea la partida y elige los montones que todavía no se usaron: 3 si hay 4–6 jugadores y 4 si hay 7–8. Deja la ronda en `prepared`, sin pasar la partida a `in_progress` y sin repartir. `deal_round` continúa desde esa ronda. La vista pública de la ronda no incluye la carta. No crea otra si la partida está `finished`, si ya se alcanzó el máximo, si no quedan montones o si alguna ronda sigue abierta. Abierta es `prepared`, `conversation` o `voting`. `finished` es la única resuelta. Un error no abre la ronda siguiente. `apply_round_scores` no cambia el estado. `close_vote` lo pasa a `finished` solo después de guardar los premios, y no abre la ronda siguiente ni termina la partida.

`deal_round` bloquea la ronda, exige `prepared` y la pasa a `conversation`. Un segundo reparto, o dos a la vez, no añade manos ni descartes. `begin_conversation(code, token)` llama a ese reparto cuando la ronda abierta está en `prepared`. No acepta un estado. Si ya está en `conversation`, devuelve la misma ronda y no emite. En `voting`, con la partida `finished` o sin ronda preparada, no cambia nada. Solo el paso real publica `round.phase_changed` después de confirmar: `code`, `number`, `status`, `dealt_count` y `discard_count`. El cliente no puede declarar esa fase. `round_state(code, token)` devuelve la vista pública de la ronda abierta. `own_card(code, token)` sigue devolviendo `number` y `text` solo al miembro de ese token. Sin token válido no hay estado ni carta. `GET /api/rooms/{code}/round/?token=` y `GET /api/rooms/{code}/card/?token=` son esas lecturas. No hay chat.

Elegir los montones es `start_round`. `prepare_round` lo hace y después reparte. Hace falta que la partida ya tenga pilas. `start_game` no la llama: falta el catálogo de 15 o 16 situaciones. El reglamento encadena la siguiente después de puntuar, si quedan pilas. Ese encadenamiento queda en OOC-008 y OOC-011.

En `conversation`, `raise_hand(code, token)` registra la mano de ese miembro. Repetirla no añade otro registro. Con `L × 2 > N` —3, 3, 4, 4 y 5 manos para 4 a 8 jugadores— `call_basta(code, token)` pasa la ronda a `voting`. Quien pide «¡Basta!» no tiene que haber levantado la mano. Ninguna de las dos acepta un id de jugador ni un umbral. Sin mayoría, en otra fase o sin token, no cambian la ronda. Repetir «¡Basta!» en `voting` devuelve la misma ronda y no crea votos. La primera mano publica `round.hand_raised`: `code`, `number`, `name`, `ready_count` y `player_count`. El paso real a `voting` publica `round.phase_changed`. `round_state` añade `ready_count` y `ready`, los nombres con la mano levantada, sin carta ni rol. El socket acepta `round.raise_hand` y `round.basta` con el payload vacío y llama a esos servicios. No hay ruta para salir, iniciar ni abrir la conversación.

Bajar la mano no está definida. Pasar `Game` a `in_progress` al abrir la ronda y los gestos de voto siguen fuera de este servicio. El snapshot de la sala no trae la carta; tras reconectar se vuelve a pedir con los GET.

El recorrido de 4 a 8 jugadores está en `realtime/test/test_round_cycle.py`. `manage.py test` no abre Redis. No hay ruta para preparar la ronda: la prueba llama al dominio. La votación sigue en OOC-008.

### Sala y anfitrión

**Estado:** decisión aprobada para la creación, la incorporación, la salida, la consulta y el inicio. La sala no es la partida. `create_room` la deja en `waiting`, le asigna un código que no se repite y registra al creador como único anfitrión y miembro. `join_room` admite a otro participante con el código, recortado y en mayúsculas, mientras la sala sigue en `waiting`. El nombre se normaliza igual que al crear y no puede repetirse. El tope es 8, el mismo de la partida, y se comprueba con la sala bloqueada. `leave_room` quita a un participante y la sala sigue en `waiting`. El anfitrión no puede irse, así que la sala no queda vacía. Cuando la sala ya empezó, tampoco se borra a nadie.

`get_room_state` devuelve el código, el estado, el anfitrión, los participantes y la cantidad. Admite incorporaciones si está en `waiting` y hay menos de 8. Puede empezar si está en `waiting` y hay entre 4 y 8. Quien tiene el código ve la misma representación. La respuesta no incluye la clave interna, el token, ni cartas, roles o votos.

`POST /api/rooms/`, `GET /api/rooms/{code}/` y `POST /api/rooms/{code}/members/` delegan en esos servicios. Crear y unirse devuelven una vez el token del miembro; la consulta de la sala no lo incluye. `GET /api/rooms/{code}/round/` y `GET /api/rooms/{code}/card/` sí lo exigen y no cambian la sala. No hay ruta para salir ni para iniciar. El contrato está en `contracts/api/rooms.md`.

`start_game` solo acepta el nombre del anfitrión. Con la sala bloqueada, exige `waiting` y entre 4 y 8 miembros, crea un `Game` en `preparing` y un `Participant` por miembro, guarda esa partida en la sala y la pasa a `started`. Otra llamada del anfitrión devuelve la misma partida. No llama a `create_piles`: no hay catálogo de 15 o 16 situaciones y el reglamento no dice qué carta se omite entre 4 y 6 jugadores. Tampoco llama a `prepare_round`. Esa preparación desde la sala sigue pendiente del catálogo de situaciones. El dominio ya puede preparar la ronda cuando las pilas existen.

El reglamento no reserva el resto de las acciones de juego a una sola persona. Indicar que se está listo o declarar el cierre cuando ya hay mayoría sigue siendo una regla de ronda de OOC-007, no un privilegio del anfitrión. Qué otras operaciones serían solo del anfitrión, la entrada con la partida ya iniciada y el acceso tardío siguen abiertos. Cerrar el socket no es abandonar la sala. El mismo token vuelve a entrar y recibe el estado público persistido, sin crear otro miembro ni otra partida. La reconexión durante una votación no está definida. No hay cuenta de usuario.

## 9. Reglas de cartas y roles

La implementación debe respetar el reglamento aprobado.

### Cantidad de cartas

Para 4–6 jugadores:

- 15 pilas de 3 cartas idénticas.
- 45 cartas en total.
- Selección de 3 pilas por ronda.
- Máximo de 5 rondas.

Para 7–8 jugadores:

- 16 pilas de 3 cartas idénticas.
- 48 cartas en total.
- Selección de 4 pilas por ronda.
- Máximo de 4 rondas.

Las pilas elegidas se consumen. No se reutilizan en rondas posteriores de la misma partida.

### Reparto

El servidor selecciona las pilas permitidas, reúne las cartas correspondientes, las baraja y reparte una carta boca abajo a cada participante. Las cartas restantes se destinan al descarte.

### Identificación de roles

Los jugadores que reciben cartas idénticas forman equipos. Los jugadores cuya carta es única entre las repartidas son impostores.

Puede haber cero, uno o varios impostores.

El servidor debe calcular esta condición utilizando las cartas realmente repartidas, no información declarada por los clientes.

## 10. Votación y puntuación

`call_basta` deja la ronda en `voting` sin votos. Ahí cada participante tiene una sola elección, y `record_votes` solo la acepta en esa fase. En `prepared`, `conversation` o `finished` no crea filas.

Quien cree que pertenece a un equipo elige `point` y los participantes que señala. No puede señalarse ni repetir un objetivo. Señalar a alguien ajeno es una elección válida. Quien cree que es impostor elige `fist` (puño, jugar seguro) o `v` (V, arriesgar), sin objetivos.

`record_votes` exige la papeleta completa. Falta un jugador, hay dos elecciones del mismo jugador o el gesto no admite ese objetivo: `InvalidVote`. La misma papeleta no duplica filas. Una distinta se rechaza. `score_votes`, al cerrar, recorre a todos los jugadores: quien no tiene elección suma 0 y no señala. `apply_round_scores` aplica esa cuenta y no cambia el estado de la ronda. El cierre de la conversación no puntúa.

Al pasar a `voting`, el servidor guarda `vote_opened_at` y `vote_closes_at`, tres segundos después. Cada número dura un segundo: 3, 2, 1 y 0. `round.countdown` publica `code`, `number`, `mark`, `opened_at` y `closes_at`. No lleva gesto, objetivo, carta ni puntos. Repetir «¡Basta!» o reconectar no reescribe el plazo. El `GET` de la ronda devuelve esas fechas y la marca que corresponde al reloj del servidor.

El cierre es `vote_closes_at`. Una papeleta con el reloj del servidor en ese instante o después se rechaza y no crea filas. Un evento puede llegar más tarde por el temporizador del proceso o por la red; esa demora no mueve el plazo. Durante `manage.py test` no se arma el temporizador: la prueba adelanta el reloj con `publish_due`.

`POST /api/rooms/{code}/vote/?token=` registra la elección de ese miembro: `point` con nombres de la partida, o `fist` y `v` sin nombres. No acepta un rol ni un id de jugador. El rol real sigue saliendo de las cartas repartidas; un compañero puede cerrar el puño y un impostor puede señalar. Repetir la misma elección no crea otra fila. Una distinta se rechaza. La respuesta vuelve solo a quien llama. El `GET` de la ronda, el de la sala y `round.countdown` no incluyen el gesto ni los objetivos. Esta llamada no puntúa.

Mientras la ronda está en `voting` y todavía no hubo revelación, siguen ocultos la carta ajena, el rol, el gesto, los objetivos y los puntos. La carta propia sigue saliendo solo por `own_card`. `round_public_view` y el `GET` de la sala no incluyen esos campos.

Al publicar la marca 0, `close_vote` aplica los premios y deja la ronda en `finished`, aunque falte alguna elección. Quien no votó no tiene fila `Vote`: en la revelación `gesture` es null, `targets` está vacío y `points` es 0. Puede jugar la ronda siguiente. Entonces salen `round.phase_changed`, sin cartas, y `round.revealed`. Cada entrada trae `name`, `card` (`number` y `text`), `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. Los puntos son el `ScoreAward`. La explicación de un equipo sale de `evaluate_team_choice`. Repetir el cierre devuelve el mismo resultado y no emite otra vez. El `GET` de la ronda incluye `results` solo en `finished`. En `voting` no lleva carta ajena, gesto ni puntos. El `GET` de la sala tampoco. `own_card` no cambia.

Un `POST` con la ronda ya `finished` responde `404` `round_unavailable`. Con el plazo vencido y el cierre todavía no ejecutado, responde `409` `invalid_round`. En ambos casos no se crea ni se cambia un voto.

La evaluación y el cálculo de puntos se ejecutan en el servidor. El cliente no envía la puntuación oficial.

### Equipos

Un jugador de equipo obtiene puntos únicamente si señala a todos sus compañeros y no señala a jugadores ajenos. Cuando cumple la condición, recibe un punto por cada compañero cuyo `point` lo incluye, aunque la lista de ese compañero esté incompleta o tenga un ajeno.

Si no cumple la condición, obtiene cero puntos.

`evaluate_team_choice` compara una elección con el equipo que sale de las cartas. Es correcta solo cuando `point` nombra exactamente a los otros miembros. `recognized_by` son los compañeros cuyo `point` incluye a ese jugador, aunque su lista esté incompleta o tenga ajenos. El puño, la V y el señalamiento de un impostor no entran. No escribe votos, no publica y no calcula puntos. Un impostor no tiene equipo en esa función.

### Impostor

El gesto seguro otorga un punto si el jugador realmente es impostor.

El gesto arriesgado otorga un punto base más un punto por cada jugador que lo señaló creyendo que era compañero, siempre que el jugador sea realmente impostor y haya recibido al menos un señalamiento de ese tipo.

Si nadie lo señala de esa manera, obtiene cero. Un jugador que no es impostor obtiene cero con cualquiera de esos gestos.

El total de la partida es la suma de los `ScoreAward` de ese participante. Puntuar la misma ronda otra vez devuelve esos puntos y no los suma de nuevo. Una ronda posterior conserva los premios de la anterior. Si crear un premio falla, la ronda no pasa a `finished`.

### Consistencia

El backend debe garantizar que:

- Una votación cerrada no se modifique silenciosamente.
- Una ronda no se puntúe dos veces.
- Los puntos no dependan del orden de llegada de las solicitudes.
- Los clientes no puedan enviar su puntuación oficial.
- Los resultados solo se revelen cuando lo permita la fase de juego.

## 11. API HTTP

Django REST Framework proporciona los endpoints HTTP.

Las rutas definitivas deben documentarse en `contracts/api/`.

Los dominios de API previstos son:

- Salas y participantes.
- Creación y acceso a partidas.
- Estado autorizado de una partida.
- Acciones de juego que no requieran comunicación persistente.
- Historial y resultados, si corresponden.

Cada contrato debe especificar:

- Método y ruta.
- Requisitos de autenticación.
- Permisos.
- Parámetros y cuerpo de la solicitud.
- Respuesta satisfactoria.
- Errores posibles.
- Efectos sobre el estado.
- Reglas de idempotencia cuando correspondan.

Las rutas de sala están en `contracts/api/rooms.md`. Crear, consultar y unirse no exigen autenticación. Salir e iniciar no se publican hasta que exista un mecanismo de identidad. No se asume otro esquema de autenticación.

## 12. Comunicación en tiempo real

Django Channels y WebSockets se utilizarán para las actualizaciones que necesiten propagación en tiempo real.

Los eventos se documentan en `contracts/realtime/`.

`create_room`, `join_room`, `leave_room` y `start_game` publican los eventos públicos al grupo `room.<code>` con `transaction.on_commit`, después de confirmar la operación. El callback vuelve a leer el estado persistido y descarta todo lo que no sea público. El socket entra en ese grupo solo si presenta el token del miembro, y al cerrar sale del grupo sin borrar al participante. Si Redis o el envío fallan, el error queda en el log y la respuesta HTTP sigue siendo la de la operación confirmada. Si el socket no está, la recuperación es `GET /api/rooms/<code>/`.

Cada evento debe definir:

- Nombre.
- Emisor autorizado.
- Destinatarios.
- Fase de juego válida.
- Esquema del payload.
- Requisitos de autorización.
- Tratamiento de duplicados.
- Datos que pueden revelarse.

### Reglas de seguridad

- Validar permisos al establecer la conexión y al procesar acciones.
- No confiar en que pertenecer a una sala autoriza cualquier operación.
- Separar eventos públicos de información privada.
- Enviar la carta secreta únicamente al jugador correspondiente.
- No difundir información secreta en mensajes de error.
- Manejar desconexiones y reconexiones.
- Recuperar el estado desde una fuente autoritativa.
- Evitar que la repetición de un evento duplique una acción.

El backend debe mantener la consistencia entre acciones HTTP y acciones WebSocket.

La estrategia de almacenamiento y distribución de canales debe definirse antes del despliegue y adaptarse al entorno elegido.

## 13. Base de datos y consistencia

PostgreSQL es la base de datos persistente.

Django ORM administra las consultas y migraciones.

### Principios

- Usar claves y restricciones coherentes con el dominio.
- Definir índices cuando lo justifique el patrón de acceso.
- Usar transacciones para operaciones que deban ejecutarse como una unidad.
- Evitar actualizaciones perdidas en operaciones concurrentes.
- Aplicar restricciones de unicidad cuando el dominio lo requiera.
- Mantener las migraciones bajo control de versiones.
- No editar manualmente la base de datos como sustituto de migraciones.
- No conectar la aplicación móvil directamente a la base de datos.

Las decisiones sobre qué estado es persistente y cuál es temporal deben documentarse al diseñar los modelos y la recuperación de partidas.

## 14. Seguridad y privacidad

La seguridad debe incorporarse desde el diseño.

### Información sensible

- No incluir secretos en el repositorio.
- No guardar credenciales reales en `.env.example`.
- No empaquetar claves privadas o secretos del servidor en la aplicación móvil.
- No registrar tokens de acceso en logs.
- No exponer cartas secretas en respuestas destinadas a otros jugadores.
- No devolver objetos internos completos si el cliente solo necesita una vista pública.

### Autorización

El servidor debe comprobar la identidad, la pertenencia a la sala, la participación en la partida y la fase correspondiente.

La interfaz puede ocultar acciones no permitidas, pero el backend debe rechazarlas igualmente.

### Entornos

La configuración debe diferenciar desarrollo, pruebas y producción.

Los secretos y las credenciales deben suministrarse mediante el mecanismo de configuración apropiado para cada entorno.

## 15. Entornos de desarrollo

Docker Compose se utilizará para facilitar la ejecución local de los servicios que requieran un entorno reproducible.

La configuración local debe documentar:

- Servicios disponibles.
- Puertos utilizados.
- Variables de entorno.
- Persistencia de PostgreSQL.
- Comandos para iniciar y detener servicios.
- Ejecución de migraciones.
- Ejecución de pruebas.
- Conexión entre backend y base de datos.
- Conexión entre la aplicación Android y el backend local.

La aplicación Android puede requerir una dirección distinta de `localhost` para acceder al host de desarrollo. La dirección concreta depende de si se usa un emulador, un dispositivo físico o una configuración de red diferente.

No asumir una dirección universal para todos los entornos.

## 16. Calidad y pruebas

La estrategia de pruebas se distribuye entre cliente y backend.

### Cliente móvil

- Comprobación de tipos TypeScript.
- Linting y formato.
- Pruebas de componentes.
- Pruebas de estado de interfaz.
- Pruebas de errores de red y reconexión.
- Verificación de la compilación Android cuando el entorno lo permita.

### Backend

- Pruebas unitarias de reglas de juego.
- Pruebas de modelos y restricciones.
- Pruebas de servicios de dominio.
- Pruebas de API y permisos.
- Pruebas de consumidores WebSocket.
- Pruebas de concurrencia e idempotencia cuando corresponda.

### Integración

- Creación y acceso a salas.
- Preparación y reparto de una ronda.
- Protección de cartas secretas.
- Cierre de conversación y votación.
- Cálculo de puntuaciones.
- Finalización de partida.
- Recuperación del estado después de una desconexión.

Los comandos concretos deben corresponder a las herramientas configuradas en los manifiestos del proyecto.

## 17. Observabilidad y errores

El backend debe generar registros suficientes para investigar fallos sin exponer información sensible.

Los errores deben permitir distinguir entre:

- Solicitud inválida.
- Operación no autorizada.
- Fase de juego incompatible.
- Recurso inexistente.
- Conflicto de estado.
- Error de infraestructura.

Los mensajes públicos deben ser comprensibles para el cliente y no revelar cartas secretas, tokens, credenciales ni detalles internos innecesarios.

La estrategia de métricas, seguimiento de errores y alertas se definirá según el entorno de despliegue.

## 18. Despliegue y evolución

La arquitectura inicial prioriza un backend Django modular, una base de datos PostgreSQL y un cliente móvil independiente.

No se propone introducir microservicios de entrada: primero deben consolidarse las reglas, los contratos y las necesidades reales de escala.

Antes de producción se deben definir:

- Alojamiento del backend.
- Alojamiento y configuración de PostgreSQL.
- Distribución de WebSockets.
- Gestión de secretos.
- Migraciones y copias de seguridad.
- HTTPS y configuración segura de conexiones.
- Monitoreo y recuperación ante fallos.
- Proceso de compilación y distribución Android.

Las decisiones de despliegue deben documentarse cuando se conozcan los requisitos reales del producto.

## 19. Reglas para futuras decisiones técnicas

Cualquier cambio arquitectónico importante debe:

1. Identificar el problema concreto que resuelve.
2. Evaluar el impacto en cliente, backend, contratos y pruebas.
3. Evitar dependencias duplicadas.
4. Preservar la autoridad del servidor sobre las reglas.
5. Mantener la privacidad de las cartas y los roles.
6. Actualizar esta documentación cuando la decisión quede confirmada.
7. Incorporar pruebas para los comportamientos afectados.

## 20. Criterio de cumplimiento

La implementación se considera alineada con esta arquitectura cuando:

- El cliente utiliza React Native + TypeScript.
- El backend utiliza Django + Django REST Framework.
- PostgreSQL se accede exclusivamente desde el backend.
- La lógica de juego autoritativa está en el servidor.
- HTTP y WebSockets respetan los mismos permisos y reglas.
- Los contratos de comunicación están documentados.
- Las cartas secretas solo se envían a los destinatarios autorizados.
- Las operaciones críticas mantienen consistencia.
- Las pruebas relevantes cubren reglas, permisos y transiciones.
- La documentación refleja la implementación real.

Las decisiones marcadas como pendientes deben resolverse antes de implementar funcionalidades que dependan directamente de ellas.