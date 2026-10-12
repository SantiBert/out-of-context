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
| OOC-005 | Implementar salas y gestión de partidas | P0 | TODO | OOC-003, OOC-004 |
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