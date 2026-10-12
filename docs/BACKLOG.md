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
| OOC-006 | Implementar comunicación en tiempo real | P0 | TODO | OOC-005 |
| OOC-007 | Implementar el flujo de una ronda | P0 | TODO | OOC-004, OOC-006 |
| OOC-008 | Implementar votación y puntuación | P0 | TODO | OOC-004, OOC-007 |
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
**Estado:** TODO  
**Dependencias:** OOC-002.3

**Criterios de aceptación:**

- [ ] Django Channels está instalado.
- [ ] Se configura el punto de entrada ASGI.
- [ ] Se documenta el funcionamiento del servidor ASGI.
- [ ] Se documenta cuándo es necesario Redis para compartir canales entre procesos.

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

Quedan fuera de OOC-004, sin servicio que cambiar:

- El cierre de la conversación cuando más de la mitad está listo, y su continuación en caso contrario.
- Marcar la partida como terminada al agotar las pilas, y elegir a todos los jugadores empatados en la puntuación máxima. `start_round` solo impide preparar otra ronda.
- Avanzar una ronda a `voting` o `finished`.
- Impedir una ronda nueva mientras la anterior sigue abierta.

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
- [ ] Distinguir reconexión y abandono cuando exista una forma de reconocer al mismo participante.
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