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

- Método de inicialización móvil: Expo o React Native Community CLI.
- Gestor de paquetes JavaScript: npm, pnpm o Yarn.
- Biblioteca de navegación.
- Estrategia de gestión de estado del cliente.
- Mecanismo de autenticación.
- Capa de almacenamiento del estado temporal de las partidas.
- Backend de canales y estrategia de despliegue de Django Channels.
- Proveedor de alojamiento y distribución de la aplicación.

No introducir dependencias importantes para estas decisiones sin revisar el repositorio y documentar el motivo de la elección.

## 3. Estructura del monorepo

La estructura objetivo es:

    .
    ├── apps/
    │   └── mobile/
    │       ├── src/
    │       ├── package.json
    │       └── ...
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

**`apps/mobile/`**

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

    apps/mobile/src/
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

Representa una sala donde los jugadores pueden reunirse.

Posibles responsabilidades:

- Identificador de sala.
- Estado de la sala.
- Participantes.
- Configuración admitida.
- Referencia a la partida activa, si corresponde.

### Player / RoomParticipant

Representa la identidad del participante dentro de una sala o partida.

Debe distinguir entre la identidad autenticada y la identidad de juego cuando sea necesario.

La autorización debe comprobar que el jugador tiene derecho a realizar la operación solicitada.

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

El backend debe administrar explícitamente las fases del juego.

Las fases iniciales propuestas son:

1. Sala abierta.
2. Preparación de partida.
3. Ronda preparada.
4. Reparto completado.
5. Conversación.
6. Cierre de conversación.
7. Votación.
8. Revelación de cartas y resultados.
9. Ronda finalizada.
10. Partida finalizada.

Los nombres y las transiciones exactas deben mantenerse alineados con `GAME_DESIGN_DOCUMENT.md`.

### Reglas de transición

- Solo las transiciones permitidas pueden ejecutarse.
- Una operación repetida no debe duplicar efectos.
- Las operaciones críticas deben ser atómicas cuando corresponda.
- Las acciones de jugadores que no participan o no tienen permiso deben rechazarse.
- Las transiciones y los resultados oficiales los decide el servidor.
- Una reconexión no debe reiniciar ni modificar una ronda.
- Las actualizaciones públicas no deben revelar información secreta.

Cuando se implementen las transiciones, conviene centralizarlas en servicios de dominio y cubrirlas con pruebas.

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

La votación debe respetar el procedimiento simultáneo definido por el reglamento.

El backend valida que cada participante emita un voto permitido y que la votación solo pueda cerrarse en la fase correspondiente.

La evaluación y el cálculo de puntos deben ejecutarse en el servidor.

### Equipos

Un jugador de equipo obtiene puntos únicamente si señala a todos sus compañeros y no señala a jugadores ajenos. Cuando cumple la condición, recibe un punto por cada compañero que también lo señaló correctamente.

Si no cumple la condición, obtiene cero puntos.

### Impostor

El gesto seguro otorga un punto si el jugador realmente es impostor.

El gesto arriesgado otorga un punto base más un punto por cada jugador que lo señaló creyendo que era compañero, siempre que el jugador sea realmente impostor y haya recibido al menos un señalamiento de ese tipo.

Si nadie lo señala de esa manera, obtiene cero. Un jugador que no es impostor obtiene cero con cualquiera de esos gestos.

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

No inventar rutas ni asumir un esquema de autenticación hasta que estén definidos.

## 12. Comunicación en tiempo real

Django Channels y WebSockets se utilizarán para las actualizaciones que necesiten propagación en tiempo real.

Los eventos se documentan en `contracts/realtime/`.

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

Los comandos concretos deben corresponder a las herramientas configuradas en los manifiestos del proyecto. No ejecutar comandos de Flutter o Dart.

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