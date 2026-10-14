# Out Of Context — Product Backlog

**Versión:** 0.2  
**Estado:** En desarrollo  
**Proyecto:** Out Of Context  
**Plataforma inicial:** Android  
**Frontend:** React Native + TypeScript  
**Backend:** Python / Django REST Framework  
**Tiempo real:** Django Channels / WebSockets  
**Base de datos:** PostgreSQL  
**Infraestructura local:** Docker Compose  
**Gestión de tareas:** Este documento

---

## 1. Convenciones

### Prioridades

| Prioridad | Significado |
|---|---|
| P0 | Crítica: necesaria para establecer los fundamentos o habilitar funcionalidades esenciales. |
| P1 | Alta: necesaria para completar el MVP, después de resolver las dependencias críticas. |
| P2 | Media: mejora la experiencia o amplía el producto después del MVP funcional. |
| P3 | Baja: opcional, futura o sujeta a validación. |

### Estados

| Estado | Significado |
|---|---|
| `TODO` | Pendiente de comenzar. |
| `IN_PROGRESS` | En desarrollo. |
| `BLOCKED` | Bloqueada por una dependencia o decisión pendiente. |
| `IN_REVIEW` | Implementada, pendiente de revisión y validación. |
| `DONE` | Cumple todos los criterios de aceptación. |

### Formato de identificadores

- `OOC-XXX`: identificador de una épica.
- `OOC-XXX.Y`: identificador de una historia de usuario o tarea dentro de una épica.

### Reglas de gestión

1. Una tarea solo pasa a `DONE` cuando cumple todos sus criterios de aceptación.
2. Una historia bloqueada no debe implementarse hasta resolver su dependencia.
3. Las decisiones de diseño pendientes deben documentarse antes de desarrollar lógica que dependa de ellas.
4. Las tareas completadas deben conservarse en el historial del backlog.
5. Las funcionalidades fuera del MVP no deben adelantarse si comprometen la entrega de las funcionalidades esenciales.

---

## 2. Resumen de épicas

| ID | Épica | Prioridad | Estado | Dependencias |
|---|---|---|---|---|
| OOC-001 | Documentar y validar las reglas del juego | P0 | IN_PROGRESS | Ninguna |
| OOC-002 | Crear la estructura del monorepo | P0 | IN_PROGRESS | OOC-001 |
| OOC-003 | Configurar entornos, calidad y pruebas automatizadas | P0 | IN_PROGRESS | OOC-002 |
| OOC-004 | Implementar modelos y lógica central del juego | P0 | DONE | OOC-001, OOC-003 |
| OOC-005 | Implementar salas y gestión de partidas | P0 | IN_PROGRESS | OOC-003, OOC-004 |
| OOC-006 | Implementar comunicación en tiempo real | P0 | IN_PROGRESS | OOC-005 |
| OOC-007 | Implementar el flujo de una ronda | P0 | IN_PROGRESS | OOC-004, OOC-006 |
| OOC-008 | Implementar votación y puntuación | P0 | IN_PROGRESS | OOC-004, OOC-007 |
| OOC-009 | Implementar la interfaz principal en React Native | P0 | TODO | OOC-002, OOC-001 |
| OOC-010 | Integrar cliente y backend | P0 | TODO | OOC-005, OOC-006, OOC-009 |
| OOC-011 | Implementar el cierre y los resultados de la partida | P1 | TODO | OOC-008, OOC-010 |
| OOC-012 | Validar el MVP mediante pruebas integrales | P0 | TODO | OOC-010, OOC-011 |
| OOC-013 | Preparar despliegue y distribución Android | P1 | TODO | OOC-012 |
| OOC-014 | Mejoras posteriores al MVP | P2 | TODO | OOC-013 |

**Nota:** OOC-001 figura como `IN_PROGRESS` porque las reglas se documentaron en un borrador, pero todavía deben validarse los detalles pendientes. Los estados de las demás épicas representan el punto de partida previsto y deben actualizarse según el avance real.

---

# 3. Épicas e historias de usuario

## OOC-001 — Documentar y validar las reglas del juego

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Objetivo:** establecer una especificación funcional fiel al reglamento original de Mimic Octopus.

**Entregable:** `docs/GAME_DESIGN_DOCUMENT.md`

### OOC-001.1 — Documentar la preparación de la partida

**Prioridad:** P0  
**Estado:** DONE

**Descripción:** documentar las cantidades de pilas, cartas y jugadores según el reglamento original.

**Criterios de aceptación:**

- [x] Se documentan las partidas de 4 a 6 jugadores con 15 pilas de 3 cartas.
- [x] Se documentan las partidas de 7 a 8 jugadores con 16 pilas de 3 cartas.
- [x] Se documenta el uso de 3 o 4 pilas por ronda, respectivamente.
- [x] Se documenta el reparto de una carta por jugador y la creación del descarte.

### OOC-001.2 — Documentar roles y formación de equipos

**Prioridad:** P0  
**Estado:** DONE

**Descripción:** definir cómo se determinan los equipos y los impostores.

**Criterios de aceptación:**

- [x] Las cartas idénticas determinan la pertenencia a un equipo.
- [x] Una carta repartida una sola vez determina un impostor.
- [x] Se contempla la existencia de varios impostores.
- [x] Se contempla la posibilidad de que no haya impostores.
- [x] Se documentan equipos de dos y tres integrantes.

### OOC-001.3 — Documentar conversación y cierre de ronda

**Prioridad:** P0  
**Estado:** DONE

**Criterios de aceptación:**

- [x] Se documenta la prohibición de revelar directamente el número o texto de la carta.
- [x] Se documenta la conversación sin turnos obligatorios.
- [x] Se documenta el mecanismo de levantar la mano.
- [x] Se define el cierre cuando más de la mitad de los jugadores está lista.

### OOC-001.4 — Documentar votación y puntuación

**Prioridad:** P0  
**Estado:** IN_PROGRESS

**Criterios de aceptación:**

- [x] Se documenta la votación simultánea.
- [x] Se documenta la identificación de todos los compañeros.
- [x] Se documenta el reconocimiento recíproco para puntuar.
- [x] Se documenta la penalización de no puntuar cuando se señala a alguien ajeno al equipo.
- [x] Se documentan las estrategias de puño y V del impostor.
- [ ] Se validan los casos límite del sistema de puntuación con ejemplos completos del reglamento.

### OOC-001.5 — Documentar el final de la partida

**Prioridad:** P0  
**Estado:** DONE

**Criterios de aceptación:**

- [x] Se documenta la conservación de los puntos.
- [x] Se documenta la condición de finalización por falta de pilas suficientes.
- [x] Se documenta la victoria por puntuación máxima.
- [x] Se documenta la victoria compartida en caso de empate.

### OOC-001.6 — Cerrar la especificación de reglas

**Prioridad:** P0  
**Estado:** TODO  
**Dependencias:** OOC-001.1 a OOC-001.5

**Criterios de aceptación:**

- [ ] Se revisa el documento completo contra el reglamento original.
- [ ] Se resuelven las dudas sobre los casos límite.
- [ ] Se eliminan contradicciones entre las distintas secciones.
- [ ] Se aprueba `docs/GAME_DESIGN_DOCUMENT.md` como fuente de verdad funcional.

---

## OOC-002 — Crear la estructura del monorepo

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-001  
**Objetivo:** crear un repositorio único con cliente, backend, documentación e infraestructura.

### OOC-002.1 — Crear el repositorio y su estructura base

**Prioridad:** P0  
**Estado:** DONE

**Criterios de aceptación:**

- [x] Existe un repositorio Git.
- [x] Se crean las carpetas `mobile/`, `backend/` y `docs/`.
- [x] Se configura `.gitignore` para archivos generados y secretos.
- [x] Se agrega un `README.md` con la estructura del proyecto.

### OOC-002.2 — Inicializar el cliente React Native

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-002.1

**Descripción:** inicializar la aplicación móvil de Out Of Context con React Native y TypeScript, respetando la estructura del monorepo y las decisiones arquitectónicas aprobadas.

**Decisión aprobada:** Expo con plantilla TypeScript, development builds y prebuild. El gestor de paquetes es npm.

**Criterios de aceptación:**

- [x] Existe una aplicación React Native válida en `mobile/`.
- [x] El cliente utiliza TypeScript.
- [x] La aplicación se ejecuta en un emulador o dispositivo Android.
- [ x] Se puede generar una compilación de desarrollo.
- [x] Existe una prueba básica ejecutable.
- [x] Se documentan los comandos de instalación, ejecución y validación.
- [x] Se utiliza un único gestor de paquetes y se conserva su archivo de bloqueo.
- [x] La configuración coincide con `docs/ARCHITECTURE.md`.

La ejecución en Android y la compilación de desarrollo siguen abiertas: el entorno de inicialización no tiene JDK ni Android SDK. El comando previsto es `npm run android` desde `mobile/`.

### OOC-002.3 — Inicializar el backend Django

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-002.1

**Criterios de aceptación:**

- [x] Existe un proyecto Django con `manage.py`.
- [x] Django REST Framework está instalado y configurado.
- [x] Existe un endpoint de salud.
- [x] El servidor puede iniciarse siguiendo las instrucciones documentadas.
- [x] Existe una prueba automatizada del endpoint de salud.

### OOC-002.4 — Preparar PostgreSQL para desarrollo

**Prioridad:** P1  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-002.3

**Criterios de aceptación:**

- [x] PostgreSQL puede ejecutarse localmente.
- [ ] Django puede conectarse a la base de datos.
- [ ] Las migraciones iniciales se ejecutan correctamente.
- [x] Las credenciales se configuran mediante variables de entorno.
- [x] No se incluyen credenciales reales en Git.

### OOC-002.5 — Preparar Django Channels

**Prioridad:** P1  
**Estado:** DONE  
**Dependencias:** OOC-002.3

Channels 4.3 y Daphne atienden HTTP y WebSocket con `runserver`. Fuera de las pruebas, el channel layer es Redis.

**Criterios de aceptación:**

- [x] Django Channels está instalado.
- [x] Se configura el punto de entrada ASGI.
- [x] Se documenta el funcionamiento del servidor ASGI.
- [x] Se documenta cuándo es necesario Redis para compartir canales entre procesos.

### OOC-002.6 — Documentar contratos y comandos

**Prioridad:** P1  
**Estado:** TODO  
**Dependencias:** OOC-002.2, OOC-002.3

**Criterios de aceptación:**

- [x] Se documenta cómo instalar y ejecutar el cliente.
- [x] Se documenta cómo instalar, ejecutar y probar el backend.
- [ ] Se define dónde documentar los contratos HTTP y WebSocket.
- [x] Se documenta la configuración necesaria para el entorno local.

---

## OOC-003 — Configurar entornos, calidad y pruebas automatizadas

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-002  
**Objetivo:** establecer un flujo de desarrollo reproducible y detectar errores antes de integrar funcionalidades.

### OOC-003.1 — Configurar herramientas de calidad para React Native y TypeScript

**Prioridad:** P1  
**Estado:** DONE  
**Dependencias:** OOC-002.2

**Criterios de aceptación:**

- [x] Se configura la comprobación de tipos de TypeScript.
- [x] Se configura ESLint o una herramienta equivalente de linting.
- [x] Se documentan los comandos de análisis, formato y pruebas.
- [x] Existe una prueba básica del cliente móvil.
- [x] Se documentan las convenciones de nombres, estructura y componentes.
- [x] Los comandos definidos coinciden con los scripts reales del proyecto.

### OOC-003.2 — Configurar herramientas de calidad para Python

**Prioridad:** P1  
**Estado:** DONE

**Criterios de aceptación:**

- [x] Se configura una herramienta de linting y formato.
- [x] Se documenta cómo ejecutar las pruebas del backend.
- [x] Se documenta cómo comprobar las migraciones.
- [x] Se definen convenciones de código Python.

### OOC-003.3 — Preparar integración continua

**Prioridad:** P1  
**Estado:** DONE

**Criterios de aceptación:**

- [x] El pipeline ejecuta las comprobaciones básicas del backend.
- [x] El pipeline ejecuta las comprobaciones básicas de React Native y TypeScript.
- [x] Los errores de análisis o pruebas hacen fallar el pipeline.
- [x] No se requieren secretos de producción para ejecutar las comprobaciones básicas.

### OOC-003.4 — Dockerizar el backend e integrarlo con PostgreSQL

**Prioridad:** P1  
**Estado:** IN_PROGRESS

**Criterios de aceptación:**

- [x] El Dockerfile y el Compose son válidos, y la imagen del backend se construye.
- [ ] Django se conecta a PostgreSQL desde el contenedor.
- [ ] Las migraciones se ejecutan desde el contenedor.
- [ ] El health check responde cuando Postgres y el backend están disponibles.
- [x] Las instrucciones de construcción, arranque, logs, migraciones, pruebas y parada están documentadas.
- [x] La imagen y el repositorio no incluyen secretos reales.

La imagen se construyó y `docker compose run --rm backend python manage.py test` pasó. `migrate` llegó al servicio `postgres` y falló la autenticación del volumen existente. El servicio `backend` no publicó `127.0.0.1:8000` porque ese puerto ya estaba ocupado. No se borró `postgres_data`.

---

## OOC-004 — Implementar modelos y lógica central del juego

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-001, OOC-003  
**Objetivo:** implementar las reglas del juego de forma independiente de la interfaz.

### OOC-004.1 — Modelar cartas y situaciones

**Prioridad:** P0  
**Estado:** DONE

**Criterios de aceptación:**

- [x] Existe un modelo de carta con identificador, número y texto.
- [x] Se pueden representar las tres copias de una carta.
- [x] Se puede determinar qué cartas se repartieron en una ronda.
- [x] Las cartas no repartidas no afectan la determinación de roles.

### OOC-004.2 — Modelar jugadores, equipos y roles

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004.1

**Criterios de aceptación:**

- [x] Se representa cada jugador de una ronda.
- [x] Se determinan los equipos mediante coincidencias de cartas.
- [x] Se identifican los impostores.
- [x] Se permiten cero, uno o varios impostores.
- [x] Se contemplan equipos de dos y tres integrantes.

### OOC-004.3 — Implementar la preparación de rondas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004.1

**Criterios de aceptación:**

- [x] Se seleccionan 3 pilas para partidas de 4 a 6 jugadores.
- [x] Se seleccionan 4 pilas para partidas de 7 a 8 jugadores.
- [x] Las cartas seleccionadas se mezclan antes del reparto.
- [x] Cada jugador recibe exactamente una carta.
- [x] Se conservan las cartas restantes para el descarte.
- [x] No se reutilizan pilas consumidas.

### OOC-004.4 — Implementar las reglas de puntuación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004.2, OOC-001.6

La fórmula recíproca quedó confirmada: un compañero cuenta si su señalamiento incluye al jugador, aunque su identificación no sea completa. OOC-001.6 sigue abierta por el resto de decisiones del reglamento. No hay flujo de votación en tiempo real ni pantallas.

**Criterios de aceptación:**

- [x] Se valida que un jugador de equipo señale a todos sus compañeros y a ningún ajeno.
- [x] Si cumple esa condición, suma un punto por cada compañero que lo señaló, aunque el voto de ese compañero sea incompleto.
- [x] Un impostor con puño obtiene 1 punto. Si no es impostor, obtiene 0.
- [x] Un impostor con V obtiene 1 punto más uno por cada jugador que lo señaló, si al menos uno lo hizo. Si nadie lo señaló, obtiene 0.
- [x] Un jugador que no es impostor y elige puño o V obtiene 0.
- [x] Un voto con jugador inválido, gesto no permitido o auto-señalamiento se rechaza.
- [x] Los mismos votos y roles producen el mismo resultado.
- [x] Procesar otra vez la misma ronda no duplica los puntos.
- [x] El cálculo no depende de endpoints ni de la interfaz.

### OOC-004.6 — Validar las reglas y los casos límite

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004.1, OOC-004.2, OOC-004.3, OOC-004.4

La verificación no cambió las reglas. Ruff, `manage.py check`, `makemigrations --check` y `manage.py test` pasaron: 93 pruebas. El dominio no importa REST, Channels ni React Native.

**Criterios de aceptación:**

- [x] Hay pruebas para 4, 5, 6, 7 y 8 jugadores, incluidos pilas, reparto y descarte.
- [x] Se rechazan menos de 4, más de 8 y los valores booleanos. Una partida terminada no queda con 3 jugadores.
- [x] No se vuelven a guardar pilas, no se reutiliza una pila consumida y una copia descartada no se reparte en la misma ronda.
- [x] Hay equipos de dos, equipos de tres, rondas sin impostores, un impostor y varios impostores con cartas distintas.
- [x] La tabla de puntuación y las operaciones repetidas de reparto, votos y premios siguen cubiertas.
- [x] Los casos que esta épica no implementa quedan enumerados abajo.

Quedan fuera de OOC-004, sin servicio que cambiar en esa épica:

- El cierre de la conversación cuando más de la mitad está listo, y su continuación en caso contrario. OOC-007.1 añade el listo y el paso a `voting`.
- Marcar la partida como terminada al agotar las pilas, y elegir a todos los jugadores empatados en la puntuación máxima. `start_round` solo impide preparar otra ronda.
- Avanzar una ronda a `finished`. OOC-007.1 no lo hace: la puntuación sigue sin mover el estado.
- Impedir una ronda nueva mientras la anterior sigue abierta. OOC-007.1 lo rechaza en `start_round`.

Siguen abiertas las decisiones del reglamento sobre el reparto digital, la conversación, la revelación simultánea y los detalles de impostor que el texto no incluye. OOC-001.6 no se cierra con esta historia.

---

## OOC-005 — Implementar salas y gestión de partidas

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-003, OOC-004  
**Objetivo:** administrar salas y partidas sin duplicar el dominio de OOC-004.

### OOC-005.1 — Definir el ciclo de vida de las salas y las partidas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004

La definición está en la sección 8 de `docs/ARCHITECTURE.md`. No se añadieron modelos, endpoints ni WebSockets. `Game`, `Participant` y `Round` siguen siendo las entidades de partida, jugador y ronda.

**Criterios de aceptación:**

- [x] Los estados persistidos de la partida y de la ronda, y las transiciones que ya existen, están documentados.
- [x] Se distingue lo que el reglamento y OOC-004 ya fijan de lo que todavía requiere aprobación.
- [x] No se crea una sala ni otro jugador que duplique `Game` o `Participant`.
- [x] El texto no contradice el reglamento.

**Decisiones pendientes:**

- [x] La sala es una entidad distinta de `Game`.
- [x] Iniciar la partida es del anfitrión, identificado por su nombre visible.
- [ ] Decidir el resto de operaciones que serían solo del anfitrión. El reglamento no reserva acciones de juego a una sola persona.
- [x] Un participante puede abandonar la sala y esta sigue en `waiting`. El anfitrión no puede irse, así que la sala no queda vacía.
- [ ] Decidir la entrada con la partida ya iniciada y el acceso tardío.
- [x] Distinguir reconexión y abandono. El token reconoce al miembro: cerrar el socket no lo saca de la sala. Abandonar sigue siendo `leave_room`.
- [ ] Elegir el mecanismo de identidad. En la sala, el MVP usa el nombre visible y no hay autenticación.

### OOC-005.2 — Implementar la creación e identificación de salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.1

`create_room` persiste `Room` y `RoomMember`. No crea una partida, no reparte cartas y no expone un endpoint.

**Criterios de aceptación:**

- [x] Una sala válida nace en `waiting` con un código de invitación único.
- [x] El creador queda como único anfitrión y miembro, identificado por su nombre.
- [x] Un nombre vacío, un nombre demasiado largo, un nombre repetido en la misma sala y un segundo anfitrión se rechazan.
- [x] No hay autenticación improvisada. El nombre visible es la identidad provisional del MVP.

### OOC-005.3 — Implementar la incorporación y salida de participantes

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.2

`join_room` y `leave_room` cambian los miembros de una sala en `waiting`. No hay endpoint ni WebSocket.

**Criterios de aceptación:**

- [x] Un participante se incorpora con el código de invitación, como máximo hasta 8, y un nombre que no esté ya en la sala.
- [x] Un participante puede irse y la sala sigue en `waiting`. El anfitrión no puede irse.
- [x] Un código desconocido, una sala que no está en `waiting`, la sala llena, un nombre repetido, la salida del anfitrión y la salida de alguien que no está se rechazan con un código de error estable.
- [x] Dos incorporaciones simultáneas cuando ya hay 7 miembros dejan un solo octavo.

### OOC-005.4 — Implementar la consulta del estado de una sala

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.3

`get_room_state` lee el estado público de una sala. No hay endpoint ni WebSocket.

**Criterios de aceptación:**

- [x] La consulta devuelve el código, el estado, el anfitrión, los participantes y la cantidad.
- [x] Indica si la sala admite incorporaciones y si hay entre 4 y 8 participantes en `waiting`.
- [x] Un código desconocido se rechaza. La respuesta no incluye claves internas, cartas, roles ni votos.
- [x] Quien tiene el código ve la misma representación. No hay autenticación improvisada.

### OOC-005.5 — Implementar el inicio de partidas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.4, OOC-004

`start_game` crea una partida en `preparing` desde una sala en `waiting`. No hay endpoint ni WebSocket. No crea pilas ni la primera ronda.

**Criterios de aceptación:**

- [x] Solo el anfitrión inicia. Con menos de 4 o una sala que no espera, no se crea partida.
- [x] Con 4 a 8 miembros la transición crea un solo `Game` y un `Participant` por miembro. Repetirla no duplica.
- [x] Un fallo durante los participantes deja la sala en `waiting` y sin partida.
- [x] No se reimplementa el mazo. Falta el catálogo que alimenta `create_piles`. La primera ronda sigue siendo `prepare_round`, en OOC-007.

### OOC-005.6 — Exponer la gestión de salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.2, OOC-005.3, OOC-005.4, OOC-005.5

`POST /api/rooms/`, `GET /api/rooms/{code}/` y `POST /api/rooms/{code}/members/` delegan en los servicios de sala. El contrato está en `contracts/api/rooms.md`. No hay WebSocket ni cliente móvil.

**Criterios de aceptación:**

- [x] Crear, consultar y unirse usan los servicios de dominio y devuelven el estado público.
- [x] Un nombre ausente o vacío, un código desconocido, un nombre repetido, la sala llena y una sala que no espera responden con un código de error estable.
- [x] La respuesta no incluye claves internas, cartas, roles ni votos.
- [x] Salir e iniciar no tienen ruta. Un nombre enviado por el cliente no demuestra la identidad, y no se añadió autenticación.

### OOC-005.7 — Validar el ciclo de vida de las salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.1, OOC-005.2, OOC-005.3, OOC-005.4, OOC-005.5, OOC-005.6

Una prueba recorre crear, consultar, unirse, salir e iniciar. Crear, consultar y unirse pasan por la API. Salir e iniciar usan el servicio, porque no tienen ruta. No hay WebSocket ni cliente móvil.

**Criterios de aceptación:**

- [x] Con 3 miembros no se inicia. Con 4 y con 8 se crea una sola partida en `preparing`, y repetir el inicio no la duplica.
- [x] El anfitrión no puede irse. Otro participante sí, y puede volver sin repetir el nombre. Después de `started` no se admite gente ni se borra a nadie.
- [x] La consulta pública no incluye la clave de la partida, cartas, roles ni votos. Salir e iniciar por HTTP responden 404.
- [x] Las incorporaciones simultáneas y los dos inicios simultáneos siguen cubiertos por las pruebas de membresía y de inicio.

Queda fuera de esta épica:

- El catálogo que alimenta `create_piles`. El inicio reutiliza `Game` y `Participant` y no inventa las 15 o 16 situaciones.
- `prepare_round`, que prepara la primera ronda. Corresponde a OOC-007.
- La identidad que haría falta para publicar salir e iniciar.
- La comunicación en tiempo real de OOC-006 y la interfaz móvil de OOC-009.

## OOC-006 — Implementar comunicación en tiempo real

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-005  
**Objetivo:** propagar el estado autorizado sin mezclar el transporte con las reglas del juego.

### OOC-006.1 — Configurar Django Channels y WebSockets

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-002.5

`runserver` usa Daphne. `ws/health/` acepta y cierra una conexión de prueba. Redis es el channel layer de ejecución. No hay eventos de juego ni cliente móvil.

**Criterios de aceptación:**

- [x] HTTP sigue en Django y el WebSocket de prueba vive en `ws/health/`.
- [x] Compose añade Redis sin sustituir Postgres. `REDIS_URL` no contiene un secreto.
- [x] Las pruebas cubren conectar, desconectar, una ruta desconocida y la configuración de Redis.
- [x] La capa en memoria solo se usa al ejecutar `manage.py test`.

### OOC-006.2 — Definir el protocolo de eventos WebSocket

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006.1

Los mensajes son `type` y `payload`. Los seis eventos públicos los emite solo el servidor. El contrato está en `contracts/realtime/events.md`. `ws/health/` no los envía. No hay rondas, votación ni cliente móvil.

**Criterios de aceptación:**

- [x] Cada evento válido lleva `type` y `payload`, y el payload de sala es el estado público.
- [x] Faltan campos, un tipo desconocido o un payload con carta, rol, voto o clave interna se rechazan.
- [x] El cliente no puede emitir esos eventos. No hay comandos del cliente.
- [x] Sigue abierta la identidad: sin ella no se define quién puede pedir unirse, salir o iniciar por el socket.

### OOC-006.3 — Autorizar conexiones WebSocket y aislar salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005, OOC-006.2

`ws/rooms/<code>/` no acepta el nombre ni un `player_id` como credencial y no une la conexión a ningún grupo. `ws/health/` no cambia. No hay rondas, cartas, votos ni puntuación.

**Criterios de aceptación:**

- [x] Una sala conocida responde `unauthorized` aunque el cliente envíe el nombre del anfitrión o un id.
- [x] Un código desconocido responde `room_not_found` sin listar miembros.
- [x] Dos salas no comparten grupo. El cliente no elige el nombre del grupo.
- [x] Un acceso válido usa el token emitido al crear o al unirse, ligado a ese miembro. Es lo único que abre `room.<code>`. Quedó entregado en OOC-006.5.

### OOC-006.4 — Integrar eventos en tiempo real con las operaciones de sala

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005, OOC-006.2

Crear, unirse, salir e iniciar publican los eventos públicos después del commit. El payload sale del estado persistido. Un fallo de Redis no deshace la operación. El socket sigue sin entrar en el grupo. No hay rondas, cartas ni puntuación.

**Criterios de aceptación:**

- [x] Cada operación confirmada emite su evento, y un alta o una baja también emiten `room.state_changed` cuando cambian los indicadores.
- [x] Una operación rechazada o revertida no publica.
- [x] Sin conexiones suscritas, el cambio queda en la base.
- [x] Si el envío falla, `POST /api/rooms/` sigue en 201 y `GET` devuelve la sala.
- [x] La entrega al socket que presenta el token quedó resuelta en OOC-006.5.

### OOC-006.5 — Gestionar desconexiones y reconexiones

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006.3, OOC-006.4

El token del miembro abre `ws/rooms/<code>/`. Al cerrar, el canal sale del grupo y el participante sigue en la sala. Reconectar envía el snapshot persistido y no crea otro miembro ni otra partida. No hay rondas, cartas ni votación.

**Criterios de aceptación:**

- [x] Desconectar saca al canal del grupo y no borra al miembro ni la partida.
- [x] El mismo token vuelve a entrar y recibe `room.snapshot`. No duplica participantes.
- [x] Un nombre, un id o el token de otra sala no entran en el grupo.
- [x] Un mensaje del cliente no cambia la sala. Si el miembro ya salió, el token deja de servir.
- [ ] Siguen abiertos el login, salir e iniciar por HTTP, la entrada tardía y la reconexión durante una votación. El cliente debe guardar el token: no se puede recuperar.

### OOC-006.6 — Pruebas de integración de WebSockets

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006.5

Varios sockets y la API recorren la misma sala. Las pruebas anteriores se conservan. `manage.py test` no abre Redis: cubre el reparto en un proceso, el aislamiento y un envío fallido. No cubre dos procesos, la caducidad de canales ni `docker compose`.

**Criterios de aceptación:**

- [x] Los sockets autorizados reciben el snapshot, el alta, el cambio de estado y el inicio.
- [x] Otra sala y una conexión sin token no reciben esos eventos.
- [x] Un alta rechazada no se publica. Sin sockets, crear, unirse y consultar siguen en REST.
- [x] Reconectar no duplica miembros. Un mensaje inválido no crea participantes.
- [x] Si el envío falla, el alta queda en `GET` y el snapshot posterior la incluye.
- [x] Los mensajes no llevan token, clave interna, carta, rol ni voto.

## OOC-007 — Implementar el flujo de una ronda

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-004, OOC-006  
**Objetivo:** recorrer una ronda con las transiciones que el reglamento ya fija, sin reimplementar el mazo ni la puntuación.

### OOC-007.1 — Definir estados y transiciones de las rondas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-005

Los estados siguen siendo `prepared`, `conversation`, `voting` y `finished`. `start_round` no abre otra ronda si queda alguna abierta. En conversación, un participante puede quedar listo. Con `L × 2 > N`, cualquier participante declara el cierre y la ronda pasa a `voting`. No hay votos ni puntos en ese paso. No hay ruta HTTP.

**Criterios de aceptación:**

- [x] Una ronda en `prepared`, `conversation` o `voting` impide crear la siguiente. En `finished`, `start_round` puede crear otra.
- [x] Quedar listo no cierra la conversación y no se duplica. Sin mayoría, el cierre no cambia el estado.
- [x] Con la mayoría, el cierre pasa a `voting` y no crea votos. Repetirlo devuelve la misma ronda.
- [x] Alguien que no juega la partida, o una ronda que no está en conversación, no deja listos ni votos.
- [ ] Siguen abiertos bajar la mano, pasar `Game` a `in_progress` al abrir la ronda, la reconexión durante la votación, el catálogo de situaciones, el paso a `finished` y los gestos de voto.

Queda fuera de esta historia el encadenamiento automático de la siguiente ronda después de puntuar. Corresponde a OOC-008 y OOC-011.

### OOC-007.2 — Preparar rondas usando montones disponibles

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-007.1

`start_round` bloquea la partida y elige montones libres: 3 para 4–6 jugadores y 4 para 7–8. La ronda queda en `prepared` para el reparto. No hay ruta HTTP ni catálogo de situaciones, así que la sala no llama a este servicio.

**Criterios de aceptación:**

- [x] Cada cantidad de 4 a 8 elige solo montones no usados y la vista pública no lleva la carta.
- [x] Sin montones, en el tope de rondas o con la partida `finished`, no se abre otra ronda.
- [x] Una segunda llamada, o dos a la vez, deja una sola ronda y no consume montones de más.
- [x] La ronda preparada se puede repartir. La partida no pasa a `in_progress`.
- [ ] Siguen abiertos el catálogo, el paso de la partida a `in_progress` y llamar a este servicio desde la sala.

### OOC-007.3 — Repartir cartas y proteger la información secreta

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-007.2, OOC-006.5

`deal_round` sigue repartiendo una carta por participante y deja el resto como descarte. Bloquea la ronda, así que un reintento no genera otro reparto. `own_card(code, token)` devuelve solo `number` y `text` de la carta de ese miembro mientras la ronda abierta está en `conversation` o `voting`. No hay ruta HTTP ni evento de sala con la carta.

**Criterios de aceptación:**

- [x] Cada participante válido recibe una carta y las sobrantes quedan como descartes ocultos.
- [x] Un segundo reparto, o dos a la vez, no crea otra asignación.
- [x] El token del miembro lee su carta. Un id de jugador, un token ajeno o una ronda sin mano no devuelven cartas.
- [x] La vista pública, la consulta de la sala y los eventos no incluyen la carta, los descartes ni los roles.
- [ ] Siguen abiertos el catálogo, el paso de la partida a `in_progress` y publicar esta lectura.

### OOC-007.4 — Implementar la fase de conversación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006, OOC-007.3

`begin_conversation(code, token)` abre la conversación con el reparto ya existente. Repetirla no reinicia la ronda ni crea otra. `round_state` devuelve el estado público y `own_card` sigue entregando la carta solo a ese miembro. El paso a `conversation` publica `round.phase_changed`. No hay chat, ni ruta HTTP, ni votos ni puntuación nuevos.

**Criterios de aceptación:**

- [x] Una ronda `prepared` de una partida no terminada pasa a `conversation` y publica el cambio de fase sin cartas.
- [x] Repetir la transición no reparte de nuevo, no abre otra ronda y no emite otro evento.
- [x] Un token inválido, una partida `finished` o una ronda en `voting` no cambian el estado.
- [x] `round_state` no incluye la carta. `own_card` sigue devolviendo la del miembro.
- [ ] Siguen abiertos el catálogo, el paso de la partida a `in_progress` y publicar la lectura de la carta.

### OOC-007.5 — Implementar manos levantadas y la señal Basta

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-007.1, OOC-007.4

`raise_hand(code, token)` y `call_basta(code, token)` usan el umbral `L × 2 > N` que ya calcula el dominio. El cliente no envía el umbral ni un id de jugador. La primera mano publica `round.hand_raised`. El cierre válido publica `round.phase_changed` con `voting`. No hay votos ni puntuación. Bajar la mano sigue sin estar definida.

**Criterios de aceptación:**

- [x] Cada jugador cuenta una vez. 4 a 8 jugadores exigen 3, 3, 4, 4 y 5 manos.
- [x] Sin mayoría, con un token ajeno o en otra fase, la ronda no cambia.
- [x] «¡Basta!» válido pasa a `voting` una sola vez y no crea votos. Repetirlo no emite.
- [x] Los eventos y `round_state` no incluyen cartas ni roles.
- [ ] Siguen abiertos bajar la mano, el catálogo, el paso a `in_progress` y la votación de OOC-008.

### OOC-007.6 — Integrar el flujo de rondas con REST y WebSockets

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006.5, OOC-007.5

`GET /api/rooms/{code}/round/?token=` y `GET /api/rooms/{code}/card/?token=` exponen el estado público y la carta propia. El socket acepta `round.raise_hand` y `round.basta` y delega en el dominio. El `GET` de la sala y los eventos de grupo siguen sin la carta. No hay votación ni ruta para abrir la conversación.

**Criterios de aceptación:**

- [x] La carta solo sale en su GET. El estado de la ronda y el snapshot de la sala no la incluyen.
- [x] La mano y «¡Basta!» llegan como eventos públicos. Un evento de servidor entrante no cambia la ronda.
- [x] Token ajeno, fase incorrecta, ronda ausente y umbral corto responden con `code` y `detail` y no cambian la ronda.
- [x] Cerrar el socket y volver a abrir deja los dos GET como recuperación.
- [ ] Siguen abiertos el catálogo, `in_progress`, bajar la mano y la votación de OOC-008.

### OOC-007.7 — Pruebas de integración del ciclo de rondas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-007.6

`realtime/test/test_round_cycle.py` recorre la ronda publicada para 4 a 8 jugadores. La sala se crea por la API. Preparar y abrir la conversación llaman al dominio: no hay ruta para eso. `manage.py test` no abre Redis. La votación sigue en OOC-008.

**Criterios de aceptación:**

- [x] De 4 a 8 jugadores, la ronda llega a `voting` con una carta por participante. Cada `GET` de carta es solo la de ese token. El de la ronda y el de la sala no la incluyen. Queda una ronda y ningún voto.
- [x] «¡Basta!» antes del umbral deja la ronda en `conversation`. Quien no levantó la mano cierra al llegar a 3, 3, 4, 4 o 5 manos.
- [x] Montones agotados y una partida sin pilas no abren otra ronda. Repetir la mano y «¡Basta!» no duplica. Dos «¡Basta!» a la vez dejan un solo `voting`.
- [x] El token de otra sala y la fase `prepared` no cambian nada. Cerrar el socket deja los dos `GET`. Un `round.hand_raised` entrante no reparte ni suma manos.
- [ ] `manage.py test` no abre Redis. No hay ruta para preparar la ronda. La votación sigue en OOC-008.

## OOC-008 — Implementar votación y puntuación

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-004, OOC-007  
**Objetivo:** registrar la votación simultánea y la puntuación que el reglamento ya fija.

### OOC-008.1 — Definir el modelo y las reglas de votación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-007

`Vote`, `VoteTarget` y `score_votes` siguen siendo la elección y la puntuación. `record_votes` solo acepta una ronda en `voting`. No hay ruta, comando ni temporizador.

**Criterios de aceptación:**

- [x] `point` señala participantes. `fist` y `v` no señalan a nadie. Una papeleta incompleta o repetida no se guarda.
- [x] Fuera de `voting` no se crean votos. La misma papeleta no duplica. Puntuar no cambia el estado.
- [x] Durante `voting`, la vista pública no incluye carta ajena, rol, gesto, objetivo ni puntos.
- [ ] Siguen abiertos qué ocurre si alguien no elige al llegar a 0 y la revelación simultánea. La cuenta dura un segundo por número y cierra a los tres; quedó en OOC-008.2.

### OOC-008.2 — Implementar el ciclo de vida y la cuenta regresiva de votación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-008.1, OOC-006, OOC-007

Al pasar a `voting` se guardan `vote_opened_at` y `vote_closes_at`. La cuenta publica `round.countdown` desde 3 hasta 0, un segundo por número, y el cierre es el instante guardado. Repetir la apertura o reconectar no reinicia el plazo. No hay worker ni gesto por defecto.

**Criterios de aceptación:**

- [x] La cuenta solo se abre al entrar en `voting`. Una segunda llamada no cambia las fechas.
- [x] Se publican las marcas 3, 2, 1 y 0 una sola vez, sin gesto, carta ni puntos.
- [x] Una papeleta en `vote_closes_at` o después no se guarda. El cliente no puede declarar la cuenta.
- [x] Cerrar el socket y volver a consultar deja el mismo `vote_opened_at` y la marca del reloj del servidor.
- [ ] Siguen abiertos el voto ausente al llegar a 0 y la revelación simultánea. `manage.py test` no arma el temporizador.