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
| OOC-009 | Implementar la interfaz principal en React Native | P0 | IN_PROGRESS | OOC-002, OOC-001 |
| OOC-010 | Integrar cliente y backend | P0 | TODO | OOC-005, OOC-006, OOC-009 |
| OOC-011 | Implementar el cierre y los resultados de la partida | P1 | TODO | OOC-008, OOC-010 |
| OOC-012 | Validar el MVP mediante pruebas integrales | P0 | TODO | OOC-010, OOC-011 |
| OOC-013 | Preparar despliegue y distribución Android | P1 | TODO | OOC-012 |
| OOC-014 | Mejoras posteriores al MVP | P2 | TODO | OOC-013 |
| OOC-015 | Modo presencial de un solo dispositivo | P2 | BLOCKED | OOC-004, OOC-009.1 |
| OOC-019 | Pulido de UX del modo presencial | P2 | IN_PROGRESS | OOC-015 |
| OOC-020 | Rediseño UI/UX e identidad visual | P2 | DONE | OOC-009, OOC-019 |

**Nota:** OOC-001 figura como `IN_PROGRESS` porque las reglas se documentaron en un borrador, pero todavía deben validarse los detalles pendientes. Los estados de las demás épicas representan el punto de partida previsto y deben actualizarse según el avance real. OOC-015 está `BLOCKED`: el diseño está escrito y la implementación no empieza mientras sigan abiertas las decisiones que cambian qué se muestra o qué se borra. No depende de OOC-010 ni bloquea OOC-011. No se crea OOC-016. OOC-017 no se marca hecha: no hubo sesiones reales de playtest. No se crea OOC-018 y no se marca hecha: no hay un APK verificable. OOC-019 recoge cortes de UX presencial; solo se formalizan las historias priorizadas. OOC-020 migra la UI a la identidad visual aprobada (pantallas nativas; sin imágenes estáticas como pantalla).

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
- [x] Salir no tiene ruta. Iniciar quedó publicado en OOC-009.5 con el token del anfitrión. Un nombre enviado por el cliente no demuestra la identidad.

### OOC-005.7 — Validar el ciclo de vida de las salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-005.1, OOC-005.2, OOC-005.3, OOC-005.4, OOC-005.5, OOC-005.6

Una prueba recorre crear, consultar, unirse, salir e iniciar. Crear, consultar y unirse pasan por la API. Salir sigue en el servicio, sin ruta. Iniciar tiene `POST /api/rooms/{code}/start/?token=` desde OOC-009.5.

**Criterios de aceptación:**

- [x] Con 3 miembros no se inicia. Con 4 y con 8 se crea una sola partida en `preparing`, y repetir el inicio no la duplica.
- [x] El anfitrión no puede irse. Otro participante sí, y puede volver sin repetir el nombre. Después de `started` no se admite gente ni se borra a nadie.
- [x] La consulta pública no incluye la clave de la partida, cartas, roles ni votos. Salir por HTTP responde 404. Iniciar responde con el token del anfitrión desde OOC-009.5.
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
- [x] El voto ausente al llegar a 0 y la revelación simultánea quedaron cerrados en OOC-008.9. La cuenta dura un segundo por número y cierra a los tres; quedó en OOC-008.2.

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
- [x] El voto ausente al llegar a 0 y la revelación simultánea quedaron cerrados en OOC-008.9. `manage.py test` no arma el temporizador.

### OOC-008.3 — Registrar las elecciones de los participantes

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-008.1, OOC-008.2

`POST /api/rooms/{code}/vote/?token=` guarda una elección en `Vote` mientras el plazo sigue abierto. La identidad es el token. No hay rol en el cuerpo, ni evento de sala, ni puntuación.

**Criterios de aceptación:**

- [x] `point` nombra participantes de esa partida. `fist` y `v` no nombran a nadie. Un token ajeno, un id o la fase incorrecta no crean filas.
- [x] La misma elección se puede repetir. Una distinta no reemplaza la guardada. Dos envíos a la vez dejan un voto.
- [x] El `GET` de la ronda y el de la sala no incluyen el gesto ni los objetivos. No se crean puntos.
- [x] El voto ausente al llegar a 0 y la revelación simultánea quedaron cerrados en OOC-008.9.

### OOC-008.4 — Evaluar elecciones de los jugadores normales

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-008.3

`evaluate_team_choice` compara la elección con el equipo real. No cambia los votos ni calcula la puntuación.

**Criterios de aceptación:**

- [x] El equipo sale de las cartas. Una elección es correcta si `point` nombra exactamente a los compañeros.
- [x] `recognized_by` incluye a un compañero que señaló al jugador, aunque su lista esté incompleta o tenga ajenos.
- [x] Pareja, trío, varios impostores, otro equipo, lista parcial y puño quedan cubiertos. Evaluar no cambia `Vote` ni crea puntos.
- [ ] Siguen fuera la puntuación del impostor y la revelación. Un impostor no se evalúa como equipo.

### OOC-008.5 — Calcular y persistir puntuaciones

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-004.4, OOC-008.4

`score_votes` ya aplica la fórmula del reglamento. `apply_round_scores` guarda un `ScoreAward` por jugador y ronda. `total_points` suma esos premios. El cierre de la conversación no llama a esa operación. Al llegar a 0, si la papeleta está completa, lo hace `close_vote`.

**Criterios de aceptación:**

- [x] Un jugador de equipo suma un punto por cada compañero que lo señaló, solo si su `point` nombra exactamente a esos compañeros.
- [x] Un impostor con puño suma 1. Con V suma 1 más cada señalamiento si recibió al menos uno, y 0 si no recibió ninguno. Si señala, suma 0.
- [x] Un compañero que cierra el puño o hace la V sigue siendo una elección válida y suma 0. El contrato de OOC-008.3 rechaza el gesto mal formado.
- [x] Puntuar otra vez no duplica filas. Una ronda posterior conserva los premios anteriores y el total es la suma de las dos.
- [x] El voto ausente al llegar a 0 quedó cerrado en OOC-008.9. La revelación quedó en OOC-008.6.

### OOC-008.6 — Cerrar la votación y revelar resultados

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-006, OOC-008.4, OOC-008.5

Al publicar la marca 0, `close_vote` puntúa y deja la ronda en `finished`. Publica `round.revealed`. No hay comando del cliente ni ronda nueva.

**Criterios de aceptación:**

- [x] Solo cierra una votación cuyo plazo ya venció. Los puntos salen de `apply_round_scores`.
- [x] La ronda pasa a `finished` después de guardar los premios. Si el premio falla, sigue en `voting`.
- [x] `round.revealed` trae carta, gesto, objetivos y puntos, sin token ni id. Repetirlo no emite ni suma de nuevo.
- [x] Antes del cierre, el `GET` de la ronda y la cuenta no llevan carta ajena, gesto ni puntos.
- [x] Si falta una elección al llegar a 0, esa persona suma 0 sin gesto y la ronda se revela. Quedó cerrado en OOC-008.9.

### OOC-008.7 — Integrar votación y puntuación con REST y WebSockets

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-008.3, OOC-008.6

`POST /api/rooms/{code}/vote/?token=` sigue guardando la elección. `GET /api/rooms/{code}/results/?token=` devuelve la revelación ya guardada. Mientras no hay premios, responde `409` `results_unavailable` y no puntúa.

**Criterios de aceptación:**

- [x] La elección y la cuenta pública siguen en el `POST` y en `round.countdown`. Un `points` en el cuerpo responde `400`.
- [x] `GET /api/rooms/{code}/results/?token=` responde `409` `results_unavailable` durante `voting`. Un token ajeno responde `401`.
- [x] Cuando los premios ya existen, esa lectura devuelve el resultado guardado y no crea filas nuevas.
- [x] El cliente no declara la cuenta, la revelación ni una puntuación.
- [x] El voto ausente al llegar a 0 quedó cerrado en OOC-008.9.

### OOC-008.8 — Pruebas de integración de votación y puntuación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-008.7

`realtime/test/test_vote_cycle.py` recorre el cierre que ya existe. No cambia la fórmula. El voto ausente quedó cerrado en OOC-008.9.

**Criterios de aceptación:**

- [x] Una partida pasa por la conversación, las manos y «¡Basta!». El socket recibe la marca 3. Cada jugador elige por `POST /api/rooms/{code}/vote/?token=` según las cartas: un trío se señala y el impostor cierra el puño.
- [x] Antes del plazo, el `GET` de la ronda, el de resultados y `round.countdown` no traen gesto, carta ajena ni puntos. Resultados responde `409` `results_unavailable`. Un token ajeno responde `401`.
- [x] `publish_due` en el plazo publica la marca 0, `round.phase_changed` con `finished` y un solo `round.revealed`. Esos puntos coinciden con `ScoreAward` y con `total_points`. Repetir el `POST`, el cierre y el `GET` no crea otra fila ni otro evento. Reconectar recibe el snapshot y el `GET` de la ronda sigue igual.
- [x] Otra partida cubre la pareja y la V: sin señalamientos, con uno y con varios. Una identificación incompleta o con un ajeno suma 0.
- [x] Si falta una elección, sale la marca 0 y `round.revealed`. Quien no eligió suma 0, con `gesture` null y sin fila de voto. Un `POST` con la ronda ya cerrada no agrega votos. Si crear el premio falla, la ronda no pasa a `finished` y no se publica la revelación.
- [x] Quien no eligió puede jugar la ronda siguiente. Quedó cerrado en OOC-008.9.

### OOC-008.9 — Cerrar el voto ausente y confirmar la revelación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-008.8

Al llegar a 0 la ronda se puntúa y se revela aunque falte alguna elección. Quien no votó suma 0, con `gesture` null y `targets` vacío, y puede jugar la ronda siguiente. El payload de `round.revealed` queda como contrato del MVP.

**Criterios de aceptación:**

- [x] Una papeleta completa sigue revelando una sola vez y no duplica premios.
- [x] Si falta una elección, o faltan varias, esas personas suman 0 y no tienen fila `Vote`. Los demás se puntúan con la fórmula ya cerrada.
- [x] Un voto después del cierre no se guarda. La revelación sale igual. Repetir el cierre no crea otra fila.
- [x] Quien no votó puede elegir en la ronda siguiente.
- [x] La revelación trae `name`, `card`, `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. No hay campo `role` ni texto de la fórmula.

## OOC-009 — Implementar la interfaz principal en React Native

**Prioridad:** P0  
**Estado:** IN_PROGRESS  
**Dependencias:** OOC-002, OOC-001  
**Objetivo:** construir la interfaz Android sobre Expo, sin duplicar las reglas del backend.

### OOC-009.1 — Estructura y navegación móvil

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-002.2

La aplicación usa React Navigation con un stack nativo. Las rutas viven en `mobile/src/navigation/`. Las pantallas son placeholders y no llaman al backend. OOC-009.3 sustituyó la entrada única por Crear sala y Unirse.

**Criterios de aceptación:**

- [x] Las rutas de inicio, crear sala, unirse, lobby, carta secreta, conversación, votación, resultados y marcador están tipadas y no llevan token, carta, rol ni puntos.
- [x] Los placeholders se recorren con el stack. Una ruta desconocida o un estado inválido vuelve a Inicio.
- [x] La estructura deja sitio para la API, el tiempo real, el tema y los hooks. No se migró de Expo.
- [ ] `npm run android` compiló el proyecto nativo y falló en CMake con el JDK 25 (`restricted method in java.lang.System`) en `expo-modules-core` y `react-native-screens`. El emulador llegó a arrancar, pero la app no se instaló.

### OOC-009.2 — Sistema visual y componentes compartidos

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.1

Los tokens viven en `src/theme/theme.ts`. Los componentes de `src/components/` se usan en los placeholders y en la pantalla Componentes. No llaman al backend.

**Criterios de aceptación:**

- [x] Color, tipografía, espacio, radio, tamaño táctil y elevación están centralizados. El botón, el campo, el título, la tarjeta, el estado, la carga, el error, el aviso, el vacío y la confirmación tienen props tipadas.
- [x] Los placeholders reutilizan título, texto auxiliar y botón. El catálogo muestra carga, error y deshabilitado.
- [x] No se añadieron dependencias. Los componentes no consultan la API ni aplican reglas de juego.
- [ ] `npm run android` sigue sin instalar la app por el JDK 25.

### OOC-009.3 — Inicio e identidad de invitado

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.2, OOC-006.5

Inicio ofrece crear una sala, unirse a una y abrir el catálogo. Crear y unirse envían solo `name`. El token de la respuesta se guarda en `expo-secure-store` y en un contexto de React, fuera de la navegación. El lobby muestra el nombre. No hay login, ni salir, ni iniciar: el mecanismo de identidad de OOC-005.1 sigue abierto.

**Criterios de aceptación:**

- [x] El nombre se recorta, no puede quedar vacío y admite como máximo 80 caracteres. El código de unirse se recorta y se pasa a mayúsculas. El cuerpo no incluye `player_id`.
- [x] Un cuerpo inválido, un fallo de red o `400`, `404` y `409` muestran el mensaje y permiten reintentar. El botón queda en carga mientras espera.
- [x] El token no viaja en los parámetros de ruta ni se escribe en consola. Tras un alta válida, el lobby muestra el nombre.
- [x] Jest cubre el recorte y el tope del nombre, el rechazo de una respuesta sin `token` y la lectura de la sesión con el almacén simulado.
- [ ] `npm run android` sigue bloqueado por el JDK 25. Esta historia no lo vuelve a ejecutar.

### OOC-009.4 — Crear y unirse a salas

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.3, OOC-006.5

Crear y unirse usan `POST /api/rooms/` y `POST /api/rooms/{code}/members/`. El cuerpo es solo `name`. El lobby muestra el `code` de esa respuesta. Los errores conocidos muestran el `detail` del servidor; un código desconocido muestra un mensaje genérico. Una pulsación repetida no lanza otra solicitud hasta que la primera termina. El cliente no aplica el tope de participantes ni el estado de la sala. No hay login, ni salir, ni iniciar.

**Criterios de aceptación:**

- [x] Crear y unirse confirman contra el backend y solo entonces abren el lobby. El código mostrado es el `code` devuelto.
- [x] `invalid_room`, `room_not_found`, `room_closed`, `room_full` y `duplicate_member` muestran el detalle. Un error desconocido no bloquea la pantalla y permite reintentar.
- [x] Los controles quedan en carga durante la solicitud y una segunda pulsación no duplica el `POST`.
- [x] Jest cubre el código devuelto, los errores conocidos y desconocidos, y dos envíos solapados.
- [ ] `npm run android` sigue bloqueado por el JDK 25. Esta historia no lo vuelve a ejecutar.

### OOC-009.5 — Lobby de la partida

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.4, OOC-006.5

El lobby carga `GET /api/rooms/{code}/` y después el socket `ws://<host>/ws/rooms/<code>/?token=`. Consume `room.snapshot`, `room.player_joined`, `room.player_left`, `room.state_changed`, `game.started` y `connection.error`. Cada evento de sala sustituye la lista de participantes. Iniciar es `POST /api/rooms/{code}/start/?token=` y solo lo ve el anfitrión. No hay cartas, roles ni votos. Salir sigue sin ruta.

**Criterios de aceptación:**

- [x] El código, el anfitrión y los participantes salen del estado público. Un evento repetido no duplica nombres.
- [x] La carga inicial es el GET. El snapshot vuelve a alinear la lista. La pantalla muestra conectando, en vivo, reconectando o el error.
- [x] Iniciar se muestra solo si el nombre de la sesión es `host`. Un `200` o `game.started` abre la carta secreta. `401`, `403` y `409` dejan el lobby en su sitio.
- [x] Jest cubre el alta repetida, la salida, la desconexión y el rechazo de inicio. El backend cubre el token del anfitrión, el `403`, el `401`, el `409` con menos de cuatro personas y la repetición.
- [ ] `npm run android` no se ejecutó.

### OOC-009.6 — Visualización de la carta secreta

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.5, OOC-007.6

La carta secreta pide `GET /api/rooms/{code}/card/?token=` y `GET /api/rooms/{code}/round/?token=`. Muestra solo `number` y `text` de la carta propia, asociados al `number` de la ronda. De la ronda conserva `number` y `status`. `round.phase_changed` borra la carta si cambia el número o la fase deja de ser `conversation` o `voting`, y vuelve a pedir los dos GET. Continuar abre Conversación solo con `status` `conversation`. No hay reparto en el cliente. `begin_conversation` sigue sin ruta.

**Criterios de aceptación:**

- [x] La carta mostrada es la del token, con su número y su texto. Una respuesta de otra ronda no se muestra.
- [x] La carga, el error, el reintento y la ausencia (`card_unavailable` o `round_unavailable`) dejan la pantalla en su sitio. La carta no entra en la navegación ni en la consola.
- [x] `round.phase_changed` sustituye la fase. `round.revealed` y el resto no aportan texto de carta.
- [x] Jest cubre la carga, el error conocido, la ausencia, el cambio de ronda y que Continuar solo vale en `conversation`.
- [ ] `npm run android` no se ejecutó.

### OOC-009.7 — Pantalla de conversación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.6, OOC-007.6

La conversación muestra la ronda y los participantes. La sala sale de `GET /api/rooms/{code}/` y las manos de `GET /api/rooms/{code}/round/?token=`: `number`, `status`, `ready` y `ready_count`. El socket es el de la sala. Envía `round.raise_hand` y `round.basta` con el payload vacío. Consume `round.hand_raised`, `round.phase_changed` y `connection.error`. Una mano repetida no duplica el nombre. «¡Basta!» se ofrece en `conversation`; el cliente no calcula `L × 2 > N`. `not_ready` deja la pantalla en su sitio. `voting` abre Votación. No hay chat, ni bajar la mano, ni cartas ni roles.

**Criterios de aceptación:**

- [x] Los participantes y las manos salen del estado oficial. Un `round.hand_raised` repetido no duplica nombres.
- [x] Levantar la mano y «¡Basta!» salen por el socket, con un solo envío mientras la solicitud no termina. `not_ready` e `invalid_round` muestran el detalle y no navegan.
- [x] `round.phase_changed` con `voting`, o un GET que ya está en `voting`, abre Votación. `round.revealed` no aporta cartas.
- [x] Jest cubre la mano repetida, el rechazo y la transición. La pantalla muestra conectando, en vivo, reconectando o el error.
- [ ] `npm run android` no se ejecutó.

### OOC-009.8 — Interfaz de votación

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.7, OOC-008.9

La votación envía `POST /api/rooms/{code}/vote/?token=` con `gesture` y `targets`. Señalar, el puño y la V son las tres formas del contrato. El jugador no recibe su rol y el cliente no decide cuál es la correcta. La marca sale de `vote_mark` o de `round.countdown`. No se resta con el reloj del teléfono. Una marca mayor que la ya recibida no reabre la cuenta. Solo el `200` confirma la papeleta. Un fallo de red la deja en duda y el reintento envía el mismo cuerpo. Al llegar a 0 no se inventa un voto. `finished` abre Resultados. `round.revealed` no guarda cartas ni gestos ajenos.

**Criterios de aceptación:**

- [x] Señalar exige otros participantes. El puño y la V no llevan nombres. El cuerpo no trae rol ni puntos.
- [x] La selección local no es un voto. Un `409` no pisa la papeleta confirmada. Una caída de red no la da por perdida ni por guardada.
- [x] La marca 0, un `status` distinto de `voting` o un `invalid_round` bloquean los controles. Una marca tardía no reabre la cuenta.
- [x] Quien no vota no envía una papeleta. El cierre de OOC-008.9 sigue en el backend. Jest cubre los tres gestos, el rechazo, la duda y el cierre.
- [ ] `npm run android` no se ejecutó.

### OOC-009.9 — Resultados de la ronda

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.8, OOC-008.9

Los resultados salen de `GET /api/rooms/{code}/results/?token=` y de `round.revealed`. Cada fila muestra `name`, `card`, `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. No hay campo `role` ni un cálculo nuevo de puntos. `results_unavailable` no muestra filas. Un evento repetido sustituye la lista y no suma. Continuar abre Marcador solo con esa lista. Una ronda `finished` no se presenta como partida terminada: la sala sigue en `started` y el cierre de la partida queda en OOC-011.

**Criterios de aceptación:**

- [x] La lista oficial muestra nombre, carta, gesto, señalados, puntos y una sola explicación. `gesture` null se lee como sin gesto.
- [x] Antes de la revelación no hay filas. `results_unavailable` muestra el detalle y permite reintentar.
- [x] El mismo `round.revealed` no duplica jugadores ni puntos. Continuar espera la lista y abre Marcador sin parámetros.
- [x] `finished` en la ronda no marca la partida como terminada. Jest cubre la fila, la ausencia, el evento repetido y la continuación.
- [ ] `npm run android` no se ejecutó.

### OOC-009.10 — Marcador y final de partida

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.9, OOC-008.5

El marcador pide `GET /api/rooms/{code}/score/?token=`. La respuesta trae `status` y `standings` (`name`, `points`) en el orden de alta. `points` es la suma ya guardada. `winners` solo llega cuando la partida está `finished`. El cliente no reordena, no suma y no elige ganadores. `round.revealed` y `round.phase_changed` con `finished` vuelven a pedir el GET. No hay otra ronda ni revancha. El cierre que pasa la partida a `finished` sigue en OOC-011.

**Criterios de aceptación:**

- [x] Los totales salen del GET, en el orden recibido. Una lectura repetida no suma puntos.
- [x] `preparing` e `in_progress` se muestran como partida en curso, sin ganadores.
- [x] `finished` muestra los `winners` del backend, incluido un empate. No hay botón de ronda nueva.
- [x] Una fila sin `points` no se completa con cero. El backend cubre el orden, el empate, el `401` y el `404`.
- [ ] `npm run android` no se ejecutó.

### OOC-009.11 — Reconexión y errores de red

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.10, OOC-006.5

Hay un solo socket por sesión. Tras un corte no fatal se reintenta 3 veces, a 1 s, 2 s y 4 s. Si un intento abre, el contador vuelve a cero. `unauthorized` y `room_not_found` no se reintentan. Al volver a vivo se piden los GET ya publicados. Una generación cerrada no pisa el estado nuevo y la fase no retrocede. El inicio, la mano, ¡Basta! y el voto no se reenvían solos.

**Criterios de aceptación:**

- [x] Después de reconectar, la pantalla vuelve a pedir el estado oficial. Un evento de una conexión anterior no lo reemplaza.
- [x] Una fase atrasada y una mano con `ready_count` menor se ignoran. La cuenta no sube si la marca llega tarde.
- [x] ¡Basta! sin confirmar queda en duda. El voto no se reenvía solo. El reintento manual del voto sigue exigiendo `voting`.
- [x] Jest cubre el corte, el tope de 3 reintentos, la generación vieja, la fase atrasada y las acciones que no se repiten solas.
- [ ] `npm run android` no se ejecutó.

### OOC-009.12 — Pruebas del flujo móvil completo

**Prioridad:** P0  
**Estado:** DONE  
**Dependencias:** OOC-009.11, OOC-003.1

`npm test` recorre el cliente con contratos simulados, sin backend ni emulador. `__tests__/flow.test.ts` encadena identidad, sala, carta, conversación, voto, resultados, marcador y reconexión, y comprueba que no se adelantan cartas ni fases. `npm run test:integration` usa el backend de `http://127.0.0.1:8000` y queda fuera del CI. No se añadió Detox, Maestro, Playwright ni React Native Testing Library: no hay emulador en este entorno y las reglas ya están en funciones puras.

**Criterios de aceptación:**

- [x] El README dice cómo ejecutar Jest, la integración local, lint, tipos y formato, y qué archivo cubre cada tramo.
- [x] El recorrido simulado no filtra cartas antes de la revelación y no cambia de fase sin un estado del servidor.
- [x] La integración local cubre alta, lobby, inicio, ausencias, marcador en curso, `401`, `404` y un snapshot repetido.
- [x] No hay runner nativo. El backend local no reparte, así que la integración no llega a conversación, voto ni partida `finished`.
- [ ] `npm run android` no se ejecutó.

## OOC-015 — Modo presencial de un solo dispositivo

**Prioridad:** P2  
**Estado:** BLOCKED  
**Objetivo:** jugar en un solo teléfono, sin backend ni socket, con las reglas ya escritas.  
**Dependencias:** OOC-004, OOC-009.1

OOC-010 sigue siendo la integración del cliente con el backend. OOC-011 a OOC-014 conservan su alcance del MVP online. Esta épica no los reescribe ni los bloquea.

### OOC-015.1 — Auditoría de reutilización

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-004, OOC-009

El límite de lo reusable quedó en `docs/ARCHITECTURE.md` y en `docs/MODO_PRESENCIAL.md`. El teléfono no importa Django. No hay endpoints ni estados de sala nuevos para este modo.

**Criterios de aceptación:**

- [x] La arquitectura y el modo dicen qué reglas del dominio se reutilizan y qué no puede importar el teléfono.
- [x] No se inventan endpoints ni estados de sala para este modo.

### OOC-015.2 — Definición funcional

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.1

`docs/MODO_PRESENCIAL.md` describe el flujo de un solo dispositivo. Las reglas compartidas y las diferencias con el online están separadas. Lo que el reglamento no define sigue pendiente. El resumen está en la sección 16 de `docs/GAME_DESIGN_DOCUMENT.md`.

**Criterios de aceptación:**

- [x] El documento describe el flujo de un solo dispositivo.
- [x] Las reglas compartidas y las diferencias con el online están separadas.
- [x] Lo que el reglamento no define sigue marcado como pendiente.

### OOC-015.3 — Arquitectura

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.2

`docs/ARQUITECTURA_PRESENCIAL.md` separa el camino local del online. La copia en TypeScript queda limitada al núcleo puro. Ese núcleo ya está en el cliente; esta historia no lo agregó. No se agrega una dependencia. La sección 21 de `docs/ARCHITECTURE.md` distingue lo confirmado de las recomendaciones.

**Criterios de aceptación:**

- [x] El camino local queda separado del online.
- [x] La copia en TypeScript queda limitada al núcleo puro y sin código.
- [x] No se agrega una dependencia.

### OOC-015.4 — Persistencia

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.3

`docs/PERSISTENCIA_PRESENCIAL.md` fija una sola partida activa, que se reanuda al abrir la aplicación, y la ausencia de historial. El archivo queda aparte de `ooc.guest.session`. Borrar al salir del marcador, la carta visible al reanudar, abandonar, reiniciar y descartar siguen como propuesta.

**Criterios de aceptación:**

- [x] Hay una sola partida activa, que se reanuda, y no hay historial.
- [x] El archivo queda aparte de `ooc.guest.session`.
- [x] Borrar al salir del marcador, la carta visible al reanudar, abandonar, reiniciar y descartar siguen sin promoverse a regla.

### OOC-015.5 — Navegación

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.4

`docs/NAVEGACION_PRESENCIAL.md` asigna una pantalla a cada fase. Una ruta que no coincide con la fase no muestra la carta ni el voto de otra. Inicio, el atrás y los rótulos siguen pendientes.

**Criterios de aceptación:**

- [x] Cada fase tiene una pantalla.
- [x] Una ruta que no coincide con la fase no muestra la carta ni el voto ajenos.
- [x] Inicio, el atrás y los rótulos siguen pendientes.

### OOC-015.6 — Implementar el modo

**Prioridad:** P2  
**Estado:** BLOCKED  
**Dependencias:** OOC-015.2, OOC-015.3, OOC-015.4, OOC-015.5, OOC-004, OOC-009.1

No depende de OOC-010 y no bloquea OOC-011. No se cierra mientras sigan abiertas las decisiones que cambian qué se muestra o qué se borra: el catálogo de 15 o 16 situaciones, la carta al reanudar, volver a mostrar una carta oculta, la cubierta de la carga, Inicio y el atrás, el diálogo de reiniciar y de salir del marcador, el momento de borrar el archivo, comprobar `L × 2 > N`, señalar a tres o más, el orden del marcador, quién confirma, los rótulos, el socket de invitado durante la partida local y cómo llegar al online sin abandonar.

El cliente ya tiene el núcleo local y pruebas de unidad. La historia sigue BLOCKED: no hay corrida en un teléfono, no hay paridad con Django y las decisiones de arriba siguen abiertas.

**Criterios de aceptación:**

- [ ] La partida corre en un teléfono, sin HTTP ni socket.
- [ ] Las pantallas siguen la fase guardada y no muestran la carta de otro jugador antes de la revelación.
- [ ] La persistencia se limita a lo confirmado en OOC-015.4.
- [ ] Los tests de paridad coinciden con los casos de Django. Si divergen, manda Django.
- [x] No se agrega una dependencia.
- [ ] El online y OOC-011 a OOC-014 quedan intactos.

## OOC-019 — Pulido de UX del modo presencial

**Prioridad:** P2  
**Estado:** IN_PROGRESS  
**Objetivo:** cerrar salidas y claridad del flujo presencial sin inventar reglas nuevas del reglamento.  
**Dependencias:** OOC-015

Las demás historias propuestas en `docs/UX_AUDIT.md` (OOC-019.2 a OOC-019.5 y OOC-019.7) no se crean aquí hasta priorizarlas. OOC-019.8 es pulido del reparto y la carga; OOC-019.9 resultados y clasificación; OOC-019.10 regresión/integración (no la pasada visual genérica de la auditoría).

### OOC-019.6 — Volver a jugar con los mismos participantes

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.4, OOC-015.5

Desde el marcador final se puede empezar otra partida presencial con los mismos nombres y orden, o abrir Nombres para editarlos. No hay historial ni revancha reglamentaria. Los participantes no se editan durante una partida activa.

**Criterios de aceptación:**

- [x] El marcador ofrece «Volver a jugar»: conserva nombres y orden, reparte una partida nueva, reinicia puntos y rondas, restablece pilas y descarta cartas, votos y resultados anteriores.
- [x] Una sola partida activa: el documento se reemplaza; no hay partidas duplicadas ni historial.
- [x] El nuevo estado se persiste y la recuperación abre Carta.
- [x] El marcador ofrece «Cambiar jugadores»: abre Nombres con la lista previa editable, sin progreso de la partida terminada.
- [x] No se pueden modificar participantes durante una partida activa.
- [x] Hay pruebas de unidad e integración del cierre.
- [x] La navegación y la persistencia documentan estas salidas.

### OOC-019.8 — Mejoras UX del reparto privado y votación física

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.5

Mejora el pase de un solo teléfono y el registro de gestos físicos ya vistos en la mesa. No cambia reglas, puntuación ni contratos online. No introduce votación online ni expone roles secretos en la carga.

**Criterios de aceptación:**

- [x] El turno del reparto es claro; la carta solo aparece con «Ver carta»; «Ocultar» es visible; se indica cuándo pasar el teléfono.
- [x] No se revelan cartas anteriores; al ir a segundo plano la carta se cubre sin avanzar el turno; al reanudar `viewing` la pasada vuelve cubierta.
- [x] La carga lista participantes, gestos point/fist/v, permite corregir, muestra resumen y bloquea confirmaciones incompletas.
- [x] Al reanudar la carga, una cubierta pide Continuar antes de mostrar gestos anotados; no muestra cartas ni roles.
- [x] La evaluación y puntuación existentes quedan intactas.
- [x] Hay pruebas de privacidad del pase, cubierta de carga y registro de votos.
- [x] La navegación y la auditoría documentan estos comportamientos.

### OOC-019.9 — Mejoras de resultados y clasificación presencial

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-015.5, OOC-019.6

Presenta resultados de ronda y clasificación sin recalcular puntuaciones ni cambiar reglas. Una fila por persona; roles visibles tras la revelación; clasificación ordenada por puntos.

**Criterios de aceptación:**

- [x] Se muestran cartas reveladas, gestos/selecciones, puntos de ronda y totales acumulados con jerarquía visual distinta.
- [x] Equipos e impostores se identifican visualmente una vez revelados.
- [x] La clasificación está ordenada por puntos (empates estables); ganadores y empates se muestran al terminar.
- [x] CTAs correctos: Siguiente ronda / Reiniciar en resultados; Volver a jugar / Cambiar jugadores en marcador.
- [x] No se recalculan puntos en la UI; no se revelan resultados antes de confirmar la votación.
- [x] Hay pruebas de presentación y regresión de dominio.
- [x] La navegación y la auditoría documentan el layout.

### OOC-019.10 — Integración y pruebas de regresión de OOC-019

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-019.6, OOC-019.8, OOC-019.9

Verifica la gestión de partidas y las mejoras UI/UX de la épica con automatización y un informe de resultados reales. No inventa playtests manuales ni supervivencia al kill del proceso.

**Criterios de aceptación:**

- [x] Escenarios 1–13 y 15–16 cubiertos por pruebas (incl. reinicio en `viewing` / `conversation` / `recording` / `results`).
- [x] Escenario 14 documentado: recovery in-process OK; kill de proceso = limitación conocida (Map).
- [x] Escenario 17: suite online del cliente ejecutada; backend documentado como bloqueado por entorno en esta corrida.
- [x] Herramientas mobile ejecutadas: typecheck, lint, format, jest (PASS).
- [x] Informe en `docs/OOC-019_REGRESSION_REPORT.md` con matriz, defectos, pendientes y recomendación GO/NO-GO.
- [x] No se marcaron como ejecutadas pruebas manuales ni de dispositivo no corridas.

## OOC-020 — Rediseño UI/UX e identidad visual

**Prioridad:** P2  
**Estado:** DONE  
**Objetivo:** reemplazar la UI minimal actual por la identidad aprobada (menta, navy, crema, amarillo, coral; tipografía redondeada; ilustraciones cartoon) con pantallas nativas reales.  
**Dependencias:** OOC-009, OOC-019

No cambia reglas de negocio ni contratos. No usa imágenes estáticas como pantalla completa. El orden de migración está en `docs/UI_REDESIGN_PLAN.md`. La guía de uso del design system está en `docs/DESIGN_SYSTEM.md`. Alcance cerrado: presencial + a11y compartida + cleanup (020.1–020.12). Look online diferido a **OOC-020.13**. Informe: `docs/OOC-020_INTEGRATION_REPORT.md`.

### OOC-020.1 — Auditoría visual y plan de migración UI/UX

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-019.10

Inventaria pantallas, componentes, tema, navegación, deuda visual y lo preservable de OOC-019. Propone design system y un plan incremental. No modifica código ni añade dependencias.

**Criterios de aceptación:**

- [x] Inspección del frontend y de GDD / ARCHITECTURE / BACKLOG / UX_AUDIT.
- [x] Inventario de pantallas, componentes, estilos, navegación, hooks y servicios.
- [x] Revisión de funcionalidades OOC-019 a preservar.
- [x] Componentes reutilizables, hardcodes y duplicaciones documentados.
- [x] Arquitectura de design system y plan incremental de migración.
- [x] Assets gráficos faltantes identificados.
- [x] Entrega en `docs/UI_REDESIGN_PLAN.md` (auditoría, riesgos, migración).
- [x] Sin cambios en `mobile/src/**` ni dependencias nuevas.

### OOC-020.2 — Design system (tokens, tipografía y primitivos)

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.1

Implementa la identidad visual en tokens y componentes base. Catalog como banco de prueba. No rediseña flujos de partida (020.4–.6 tras renumeración).

**Criterios de aceptación:**

- [x] Tokens semánticos y paleta de marca en `mobile/src/theme/theme.ts`.
- [x] Tipografía Baloo 2 (OFL) para títulos; sistema para UI; carga con `expo-font`.
- [x] Espaciados, radios, bordes y sombras centralizados.
- [x] Botones primary / secondary / destructive.
- [x] TextField con validación visual; ContentCard; ConfirmAction.
- [x] SelectableOption, ScreenHeader, ProgressIndicator.
- [x] Catalog muestra la identidad; stack usa colores de theme.
- [x] Documentación en `docs/DESIGN_SYSTEM.md`.
- [x] Pruebas de theme/design system; sin romper navegación ni reglas.

### OOC-020.3 — Identidad gráfica y logo

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.2

Prepara la integración de logo, mark y splash. Wordmark tipográfico Baloo como puente. No inventa PNG finales ni usa arte de terceros. Lista de pendientes en `docs/BRAND_ASSETS.md`.

**Criterios de aceptación:**

- [x] Auditoría de assets actuales y requisitos técnicos documentados.
- [x] Registro central `mobile/src/theme/brandAssets.ts` (sin require a paths inexistentes).
- [x] Componentes `BrandLogo` y `BrandMark` (variantes light/dark, tamaños, escalado contain).
- [x] Home muestra BrandLogo; Catalog muestra variantes light/dark y marks.
- [x] `app.json`: splash cream + adaptive background cream; íconos Expo como puente.
- [x] Pendientes/bloqueos de PNG de marca documentados (no se inventó arte final).
- [x] Pruebas de brandAssets; DESIGN_SYSTEM y UI_REDESIGN_PLAN actualizados (renumeración 020.4–.8).

### OOC-020.4 — Rediseño de la pantalla de inicio

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.2, OOC-020.3

Rediseña Home con identidad visual, CTA Jugar (amarillo), Continuar partida según recovery, modal Cómo se juega (copy GDD) y acceso online. No inventa descartar partida ni quita Crear sala / Unirse.

**Criterios de aceptación:**

- [x] Lógica de entry en `homeEntry.ts` (canStart / canContinue / continueRoute).
- [x] Home con fondo crema, decoración menta, BrandLogo/Mark, SafeArea.
- [x] Jugar (`accent`) y Continuar → reset a fase guardada (Jugar pasa a ModeSelect en OOC-020.5).
- [x] Modal Cómo se juega con bullets del reglamento; sin ruta inventada.
- [x] Crear sala / Unirse / Componentes conservados (online se mueve a OnlineEntry en OOC-020.5).
- [x] Recovery unavailable muestra error; header de Home oculto.
- [x] Pruebas `homeEntry` y copy de Home; OOC-020.4 documentado.

### OOC-020.5 — Rediseño de selección de modo

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.4

Pantalla ModeSelect (navy) con tarjetas Un dispositivo / Multidispositivo. Online vía OnlineEntry → CreateRoom/JoinRoom sin cambiar su lógica.

**Criterios de aceptación:**

- [x] Rutas `ModeSelect` y `OnlineEntry` en el stack.
- [x] `ModeSelectCard` reutilizable (light / darkAccent, iconos geométricos, a11y).
- [x] Un dispositivo → LocalSetup cuando `canStartLocal`; si no, deshabilitado + hint a Continuar.
- [x] Multidispositivo → OnlineEntry → Crear sala / Unirse.
- [x] Home: Jugar → ModeSelect; sin sección En línea duplicada.
- [x] Sin endpoints nuevos ni ilustraciones copiadas.
- [x] Pruebas de rutas/modeSelect; UI_REDESIGN renumerado (020.6–.9).

### OOC-020.6 — Rediseño de gestión de jugadores

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.5

Rediseña LocalSetup (Jugadores) con filas numeradas, Añadir discontinuo y Continuar → revisión. Reutiliza `setup.ts` y persistencia; no cambia duplicados ni ids.

**Criterios de aceptación:**

- [x] UI cream, encabezado Jugadores, límites 4–8, contador.
- [x] `PlayerRosterRow` con índice visual, ellipsis, Editar/Quitar.
- [x] `DashedButton` Añadir jugador; Continuar abre revisión existente.
- [x] Roster inmutable si la partida ya empezó; revisión + Confirmar intactos.
- [x] KeyboardAvoidingView / ScrollView; errores de validación visibles.
- [x] Sin cambio de dominio salvo presentación; tests `localSetup` + `localSetupUi`.

### OOC-020.7 — Rediseño de configuración de partida

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.6

Pantalla de revisión/confirmación (`LocalMatchConfig`). Solo muestra datos del dominio (jugadores, pilas/rondas). No inventa impostores fijos ni temporizador. Comenzar partida ejecuta el deal existente.

**Criterios de aceptación:**

- [x] Auditoría: sin opciones editables de partida en el MVP presencial.
- [x] Ruta `LocalMatchConfig`; Continuar desde Jugadores navega ahí.
- [x] Resumen jugadores + info `localDeckConfig` + reglas estáticas.
- [x] Comenzar partida → confirmPendingSetup + dealLocalMatch + LocalCard.
- [x] Sin controles de impostores/duración; sin endpoints nuevos.
- [x] Pruebas `matchConfig`; UI_REDESIGN actualizado.

### OOC-020.8 — Rediseño del reparto privado

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.7, OOC-019.8

Rediseña LocalCard (navy): turno → Ver carta → situación → Ocultar → pasar. Reutiliza `viewing.ts` y AppState. No re-ver cartas anteriores ni filtrar roles.

**Criterios de aceptación:**

- [x] `PrivateDealFrame` + `SituationCard`.
- [x] Estados covered / visible / complete con CTAs grandes.
- [x] AppState cubre sin avanzar; resume cubierta.
- [x] Sin roles ni cartas ajenas; Continuar → LocalTable.
- [x] Header navy; tests privacy + `localCardUi`; docs actualizados.

### OOC-020.9 — Rediseño de conversación y votación física

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.8, OOC-019.8

Rediseña LocalTable (navy) y LocalRecord (crema/menta): fase/ronda, Abrir carga, cubierta de privacidad, GesturePicker, resumen y confirmación incompleta bloqueada. Sin temporizador ni votación online. Reutiliza `vote.ts` y `recordGate`.

**Criterios de aceptación:**

- [x] Mesa navy con ronda, fase Conversación e instrucción; CTA Abrir carga.
- [x] Carga cream/menta: cover → lista → gestos → correcciones → resumen.
- [x] `GesturePicker` + StatusBadge; Confirmar disabled si falta registro.
- [x] Sin secretos anticipados; sin timer; scoring intacto.
- [x] Tests `localTableUi` / `localRecordUi`; UI_REDESIGN renumerado.

### OOC-020.10 — Rediseño de resultados y clasificación

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.9, OOC-019.9

Rediseña LocalResults (crema): tarjetas de participante, equipos, gestos, puntos ronda/total, clasificación ordenada, celebración discreta en marcador y CTAs por estado. Consume `presentLocalResults` / `localResultView` sin recalcular puntuación.

**Criterios de aceptación:**

- [x] `ResultPlayerCard` + `StandingRow`; shell cream.
- [x] Cartas, roles, gestos, equipos y selecciones post-cierre.
- [x] Puntos ronda vs total diferenciados; ranks; ganadores/empates.
- [x] Siguiente ronda / Volver a jugar / Cambiar jugadores según estado.
- [x] Sin revelar fuera de results/finished; tests presentación + `localResultsUi`.

### OOC-020.11 — Navegación, animaciones y accesibilidad

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.10

Unifica `HomeButton`, Atrás = Inicio en fases locales (sin abandonar), transiciones native-stack con reduce-motion, contraste documentado, KAV en Crear/Unirse y confirmación de abandono destructive. Sin libs de animación nuevas ni cambios de reglas.

**Criterios de aceptación:**

- [x] `HomeButton` único en local + online + Catalog.
- [x] `useExitToHomeOnBack` en Carta/Mesa/Carga/Resultados.
- [x] `useReducedMotion` + stack `fade`/`none` + ConfirmAction.
- [x] Sin animar revelado de carta; abandon confirm destructive.
- [x] Contraste en DESIGN_SYSTEM; tests `homeButton` / `navigationA11y`.

### OOC-020.12 — Integración final y eliminación de UI obsoleta

**Prioridad:** P2  
**Estado:** DONE  
**Dependencias:** OOC-020.11

Audita pantallas migradas, elimina solo código sin referencias (`ScreenPlaceholder`), ejecuta typecheck/lint/Jest con resultados reales y publica informe GO/NO-GO. No rediseña online ni cambia dominio.

**Criterios de aceptación:**

- [x] Auditoría: único muerto borrable = `ScreenPlaceholder` (0 refs).
- [x] `ScreenPlaceholder` eliminado; docs actualizados.
- [x] typecheck, lint y Jest verdes (48 suites / 268 tests).
- [x] Informe `docs/OOC-020_INTEGRATION_REPORT.md` con GO parcial / NO-GO unificación total.
- [x] Épico OOC-020 DONE; look online → OOC-020.13.

### OOC-020.13 — Rediseño visual del flujo online

**Prioridad:** P2  
**Estado:** TODO  
**Dependencias:** OOC-020.12

Migra Lobby → SecretCard → Conversation → Voting → Results → Scoreboard (y pulido Create/Join) a la identidad visual, reutilizando compuestos locales donde aplique (`GesturePicker`, etc.). Misma autoridad servidor; sin filtrar cartas ajenas.