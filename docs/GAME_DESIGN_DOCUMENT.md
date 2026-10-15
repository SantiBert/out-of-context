# Out Of Context — Game Design Document

**Versión:** 0.1  
**Estado:** Borrador para validación  
**Épica:** OOC-001 — Documentar y validar las reglas del juego  
**Juego de referencia:** Mimic Octopus  
**Plataforma objetivo inicial:** Android  
**Tipo de juego:** Juego social de deducción, conversación y roles ocultos

---

## 1. Descripción general

Out Of Context es un juego social en el que los jugadores reciben información secreta sobre una situación y deben conversar para descubrir quiénes comparten su misma carta.

Los jugadores que reciben cartas idénticas forman un equipo. Aquellos que reciben una carta que ningún otro jugador tiene son impostores.

El objetivo de los miembros de un equipo es reconocerse mutuamente sin señalar a jugadores que no pertenecen a su equipo. El objetivo de los impostores es pasar desapercibidos, camuflarse dentro de otros equipos y maximizar su puntuación.

La información de cada jugador permanece oculta durante la conversación. Los jugadores no pueden revelar directamente el número ni el texto de su carta.

La partida se divide en rondas. En cada ronda, los jugadores conversan, deciden cuándo están listos para finalizar, votan simultáneamente y obtienen puntos según su rol y sus decisiones.

## 2. Objetivos de diseño

- Reproducir fielmente las reglas fundamentales de Mimic Octopus.
- Crear una experiencia social centrada en la conversación y la deducción.
- Mantener en secreto la información individual de cada jugador.
- Permitir partidas de 4 a 8 jugadores.
- Gestionar automáticamente la preparación de rondas, los roles, la votación y la puntuación.
- Evitar que la lógica digital introduzca ventajas o restricciones que no existen en el reglamento original.

## 3. Componentes del juego original

### 3.1. Cartas de situación

Cada carta tiene un número identificador y un texto que describe una situación, característica o contexto.

Ejemplos:

**Carta #1 — Lenguaje sofisticado**

> Estás realmente orgulloso de tu don con el lenguaje. Disfrutás mucho las palabras sofisticadas.

**Carta #2 — Dieta nueva**

> ¡Faaaa! ¡Increíble! La dieta nueva cambió tu vida.

**Carta #3 — Mentiroso**

> Chanta, mentiroso, chamuyero. Todo el tiempo estás mintiendo.

**Carta #4 — Casa Real**

> Con orgullo y elegancia representás a la Casa Real a la cual pertenecés.

Cada tipo de carta cuenta con tres copias idénticas.

Una carta no identifica permanentemente a un equipo: su función depende de qué jugadores la reciban en una ronda determinada.

### 3.2. Cartas de puntuación

Las cartas utilizadas en una ronda pueden emplearse para representar los puntos obtenidos por los jugadores. Los jugadores conservan frente a sí una carta por cada punto ganado.

Si es necesario, se toman cartas adicionales del mazo de descarte. Si no quedan cartas suficientes, el reglamento permite utilizar otro objeto para llevar la cuenta.

### 3.3. Cartas de información

El juego físico incluye dos cartas de información: una identificada como «Atención» y otra con un código QR. Se separan antes de preparar las pilas y no se mezclan con las cartas de juego.

La función digital equivalente queda fuera del alcance de las reglas de una ronda y deberá definirse como parte de la interfaz del producto.

## 4. Preparación de la partida

La cantidad de jugadores determina cuántas pilas se preparan y cuántas se utilizan en cada ronda.

| Cantidad de jugadores | Pilas iniciales | Cartas iniciales | Pilas por ronda |
|---|---:|---:|---:|
| 4 a 6 | 15 | 45 | 3 |
| 7 a 8 | 16 | 48 | 4 |

Cada pila contiene tres copias de una misma carta y representa una situación posible: cómo se come, cómo se siente, dónde está el jugador, entre otras.

En el juego físico, las pilas se forman boca abajo, sin leer las cartas.

Las pilas preparadas determinan la cantidad de material disponible para las rondas. En cada ronda se consumen varias pilas, por lo que la cantidad máxima de rondas depende tanto de las pilas iniciales como de las pilas utilizadas por ronda.

## 5. Preparación de una ronda

1. Si participan entre 4 y 6 jugadores, se seleccionan al azar 3 pilas.
2. Si participan 7 u 8 jugadores, se seleccionan al azar 4 pilas.
3. Se mezclan las cartas de las pilas seleccionadas para formar el mazo de la ronda.
4. Se reparte una carta boca abajo a cada jugador.
5. Las cartas restantes se dejan boca abajo formando el mazo de descarte.

Cada jugador recibe una carta en secreto. El rol se determina por la distribución de las cartas entre los participantes, no por el número de la carta en sí.

## 6. Roles y formación de equipos

Existen dos roles posibles.

### 6.1. Miembro de un equipo

Un jugador pertenece a un equipo cuando al menos otro jugador recibe una copia idéntica de su carta.

Los jugadores que reciben la misma carta forman un equipo durante esa ronda.

Un equipo puede tener dos o tres miembros, según las cartas repartidas.

Los miembros de un equipo deben reconocerse mutuamente. Durante la conversación pueden representar o insinuar las características de su carta, sin revelar directamente su número ni su texto.

Cuanto más reconocible sea su representación, más fácil será encontrar a sus compañeros. Sin embargo, ser demasiado evidente puede permitir que un impostor copie la situación y se haga pasar por un miembro del equipo.

### 6.2. Impostor

Un jugador es impostor cuando ningún otro jugador recibe su misma carta.

Puede haber uno, varios o ningún impostor en una ronda.

Los impostores no forman un equipo entre sí por el mero hecho de compartir el rol: sus cartas son diferentes.

El objetivo del impostor es pasar desapercibido. Para ello, puede observar las conversaciones, identificar una situación representada por otros jugadores e imitarla para intentar camuflarse dentro de un equipo.

Un impostor no necesita descubrir a los demás impostores para cumplir su objetivo.

### 6.3. Regla de determinación del rol

Para cada jugador:

- Si su carta aparece en las manos de dos o tres jugadores, pertenece a ese equipo.
- Si su carta aparece una sola vez, es impostor.

La evaluación se realiza exclusivamente sobre las cartas repartidas en la ronda actual. No se consideran las cartas que permanecen en el descarte ni las copias que no se hayan repartido.

## 7. Conversación

Una vez que todos han leído su carta en secreto, comienza la conversación.

No hay turnos obligatorios. Todos pueden participar libremente, con una restricción fundamental:

**Está prohibido revelar directamente el texto o el número de la carta.**

Los jugadores deben utilizar la conversación para representar su situación, detectar coincidencias e identificar a sus compañeros.

Para ayudar a iniciar una conversación, el reglamento original propone preguntas como:

- ¿Qué hiciste hoy?
- ¿A dónde te gustaría ir de vacaciones?
- ¿Cuál es tu postre favorito?

Estas preguntas son ejemplos de disparadores de conversación, no una lista obligatoria.

La duración de la conversación no está fijada mediante un temporizador en el reglamento físico. La ronda termina cuando se cumple la condición de finalización descrita en la siguiente sección.

## 8. Finalización de la ronda

Cada jugador decide individualmente cuándo considera que está listo para terminar la ronda.

Cuando un jugador quiere indicar que está listo, levanta la mano. Puede continuar participando de la conversación mientras mantiene la mano levantada.

Cuando más de la mitad de los jugadores ha levantado la mano, cualquier jugador puede decir «¡Basta!» para terminar la conversación.

### 8.1. Condición matemática

Si `N` es el número total de jugadores y `L` la cantidad de jugadores que han levantado la mano, la condición se cumple cuando:

`L × 2 > N`

Ejemplos:

| Jugadores | Mínimo de manos levantadas |
|---:|---:|
| 4 | 3 |
| 5 | 3 |
| 6 | 4 |
| 7 | 4 |
| 8 | 5 |

La votación comienza después de que se declara el final de la conversación.

## 9. Votación simultánea

Una vez finalizada la conversación, todos los jugadores votan simultáneamente.

El procedimiento del juego físico es el siguiente:

1. Todos cuentan juntos desde 3 hasta 0.
2. Al llegar a 0, todos realizan simultáneamente el gesto correspondiente a su decisión.
3. Nadie puede abstenerse de votar.
4. Los jugadores mantienen sus gestos mientras revelan sus cartas.

En la partida digital, si al llegar a 0 alguien no envió su elección, la votación se cierra igual. Esa persona suma 0 puntos, no recibe un gesto y puede jugar las rondas siguientes. Las elecciones ya enviadas se puntúan con las reglas de la sección 10. Después del cierre no se aceptan votos nuevos.

Los gestos representan decisiones diferentes según el rol que cada jugador cree tener.

### 9.1. Votación de los miembros de un equipo

Si un jugador cree que pertenece a un equipo, debe señalar con el dedo índice a los jugadores que considera sus compañeros.

- Un dedo índice: cree que tiene un compañero.
- Dos dedos índices, uno hacia cada jugador: cree que tiene dos compañeros.

El jugador debe identificar a todos los miembros de su equipo, incluido el reconocimiento recíproco necesario para puntuar.

No debe señalar a jugadores ajenos a su equipo.

### 9.2. Votación de los impostores

Si un jugador cree que es impostor, debe elegir entre dos estrategias:

- Jugar seguro: cerrar el puño.
- Arriesgar: formar una V con los dedos.

La estrategia se selecciona antes de revelar las cartas. La puntuación depende de si el jugador realmente era impostor y, en el caso de arriesgar, de cuántos jugadores lo señalaron como posible compañero.

## 10. Sistema de puntuación

### 10.1. Miembros de un equipo

Un jugador obtiene puntos únicamente si cumple las dos condiciones siguientes:

1. Señala a todos sus compañeros.
2. No señala a ningún jugador que no pertenezca a su equipo.

Si cumple ambas condiciones, obtiene un punto por cada compañero que también lo haya reconocido.

Si omite a un compañero o señala a una persona ajena a su equipo, obtiene cero puntos.

**Ejemplo:** A, B y C forman un equipo. A señala correctamente a B y C. B también señala a A, pero C no lo reconoce. A obtiene un punto porque solo B lo reconoció correctamente.

Un compañero cuenta como reconocimiento si su señalamiento incluye a ese jugador, aunque su propia identificación esté incompleta o incluya a alguien ajeno. El puño y la V no señalan a nadie. En el ejemplo, B no necesita haber señalado también a C para que A reciba ese punto.

La puntuación depende de las decisiones de ambos jugadores, no solamente de que A haya identificado correctamente al equipo.

### 10.2. Impostores: jugar seguro

El jugador cierra el puño.

- Si realmente es impostor, obtiene 1 punto.
- No recibe puntos adicionales por los jugadores que lo hayan señalado.
- Si no era impostor, obtiene 0 puntos.

### 10.3. Impostores: arriesgar

El jugador forma una V con los dedos.

- Si realmente es impostor y al menos un jugador lo señaló creyendo que era su compañero, obtiene 1 punto más 1 punto por cada jugador que lo señaló.
- Si realmente es impostor, pero nadie lo señaló, obtiene 0 puntos.
- Si no era impostor, obtiene 0 puntos independientemente del gesto realizado.

La estrategia arriesgada permite obtener puntos adicionales a partir de la cantidad de jugadores que creen que el impostor pertenece a su equipo.

### 10.4. Resumen de puntuación

| Situación | Puntuación |
|---|---:|
| Miembro de equipo que cumple las condiciones de identificación | 1 punto por cada compañero que también lo reconoció |
| Miembro de equipo que no identifica a todos sus compañeros | 0 puntos |
| Miembro de equipo que señala a alguien ajeno | 0 puntos |
| Impostor que juega seguro y acierta su rol | 1 punto |
| Impostor que arriesga y acierta su rol, con al menos un jugador que lo señaló | 1 punto + 1 por cada jugador que lo señaló |
| Impostor que arriesga y no recibe señalamientos | 0 puntos |
| Jugador que elige una estrategia de impostor pero no era impostor | 0 puntos |

## 11. Reparto y conservación de puntos

Una vez reveladas las cartas y comprobados los resultados, cada jugador determina cuántos puntos obtuvo.

Por cada punto, conserva una carta frente a sí hasta el final de la partida.

Las cartas utilizadas en la ronda que no se necesitan para representar puntos vuelven al mazo de descarte.

Si el descarte no contiene suficientes cartas para representar todos los puntos, se utiliza otro objeto para llevar la cuenta.

En la implementación digital, la puntuación se registrará como un valor numérico persistente durante la partida. No es necesario reproducir literalmente el mecanismo físico de las cartas utilizadas como marcadores.

## 12. Continuación y final de la partida

Después de puntuar:

1. Se comprueba si quedan suficientes pilas para preparar otra ronda.
2. Si quedan suficientes, se inicia una nueva ronda.
3. Si no quedan suficientes, la partida termina.

Gana el jugador que tenga más puntos al finalizar la partida.

Si dos o más jugadores comparten la puntuación máxima, comparten la victoria.

Las cartas utilizadas como puntos y las que permanecen en el descarte deben separarse de las pilas sin usar al preparar una nueva partida física.

## 13. Requisitos funcionales derivados

Los siguientes requisitos traducen las reglas del juego a comportamientos que deberá implementar Out Of Context.

### Preparación y configuración

- **RF-001:** Permitir partidas de 4 a 8 jugadores.
- **RF-002:** Determinar la cantidad de pilas iniciales según el número de jugadores.
- **RF-003:** Seleccionar al azar la cantidad de pilas requerida para cada ronda.
- **RF-004:** Mezclar las cartas seleccionadas y repartir una a cada jugador.
- **RF-005:** Mantener la información de las cartas oculta para los demás jugadores.

### Roles y equipos

- **RF-006:** Determinar los equipos mediante coincidencias de cartas en la ronda actual.
- **RF-007:** Identificar como impostor a todo jugador cuya carta no tenga otra copia entre las cartas repartidas.
- **RF-008:** Admitir rondas con uno, varios o ningún impostor.
- **RF-009:** Permitir que el número de impostores cambie entre rondas.

### Conversación y finalización

- **RF-010:** Permitir que los jugadores indiquen que están listos para finalizar la ronda.
- **RF-011:** Finalizar la conversación cuando más de la mitad de los jugadores esté lista y se declare el cierre.
- **RF-012:** Impedir abstenciones durante la votación.
- **RF-013:** Registrar las decisiones de todos los jugadores para resolver la votación.

### Puntuación y partida

- **RF-014:** Validar la identificación completa y recíproca de los miembros de un equipo.
- **RF-015:** Aplicar correctamente las reglas de puntuación del impostor.
- **RF-016:** Mantener la puntuación acumulada de cada jugador.
- **RF-017:** Terminar la partida cuando no queden pilas suficientes para otra ronda.
- **RF-018:** Reconocer como ganadores a todos los jugadores empatados en la puntuación máxima.

## 14. Casos de validación

Antes de considerar terminada la implementación de las reglas, se deberán probar al menos los siguientes escenarios:

- Una ronda en la que todos los jugadores pertenezcan a equipos.
- Una ronda con un único impostor.
- Una ronda con varios impostores que tengan cartas diferentes.
- Una ronda con equipos de dos integrantes.
- Una ronda con un equipo de tres integrantes.
- Un jugador que reconoce correctamente a todos sus compañeros y recibe reconocimiento recíproco.
- Un jugador que omite a uno de sus compañeros.
- Un jugador que señala a alguien ajeno a su equipo.
- Un impostor que juega seguro y acierta su rol.
- Un impostor que arriesga y recibe uno o varios señalamientos.
- Un impostor que arriesga y no recibe ningún señalamiento.
- Un jugador que elige una estrategia de impostor, pero no es impostor.
- El cierre de la conversación con una mayoría exacta superior a la mitad.
- La continuación de la conversación cuando la cantidad de jugadores listos no supera la mitad.
- El final de una partida sin pilas suficientes para otra ronda.
- Una partida en la que varios jugadores empatan en la puntuación máxima.

## 15. Decisiones pendientes de validación

Este documento recoge las reglas que se han podido reconstruir a partir del reglamento compartido. Antes de cerrar OOC-001, deben resolverse las siguientes cuestiones:

1. **Distribución de cartas:** confirmar que la selección de pilas y el reparto aleatorio pueden representarse digitalmente sin cambiar las probabilidades del juego físico.
2. **Interfaz de conversación:** sigue abierta. El modo de un solo dispositivo está descrito en la sección 16 y no exige manos ni «¡Basta!» en la aplicación. Falta decidir si ese dispositivo debe comprobar `L × 2 > N`. La conversación remota no está definida. En ambos casos la interfaz no debe revelar información secreta.
3. **Votación digital:** resuelta. La elección se registra con `POST /api/rooms/{code}/vote/?token=`. Al llegar a 0 el servidor revela a la vez `round.revealed`. Cada jugador trae `name`, `card` (`number` y `text`), `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. No hay un campo de rol ni un texto de la fórmula. Quien no eligió suma 0, con `gesture` null y `targets` vacío, y sigue en las rondas siguientes.
4. **Condición de puntuación del equipo:** resuelta. Un compañero cuenta si su señalamiento incluye al jugador, aunque la identificación de ese compañero esté incompleta o incluya a alguien ajeno. Vale para equipos de dos y de tres.
5. **Estrategias del impostor:** verificar cualquier detalle adicional del reglamento original que no esté incluido en el texto disponible.

Las decisiones de arquitectura, conectividad, persistencia y seguridad están en `docs/ARCHITECTURE.md`. El modo presencial de un solo dispositivo está en la sección 16. Las tareas de implementación se gestionan en `docs/BACKLOG.md`.

## 16. Modo presencial de un solo dispositivo

Modo de producto para una mesa con un solo teléfono. No agrega reglas al reglamento. El detalle está en `docs/MODO_PRESENCIAL.md`. La épica es OOC-015 y no está implementada. Esta sección no cierra OOC-001.

### Alcance

Una persona anota de 4 a 8 nombres en el dispositivo. Con esa lista se preparan y se reparten las pilas según las reglas ya escritas. El teléfono muestra la carta de un solo jugador y la oculta con una acción explícita antes de pasar al siguiente. La conversación y el gesto ocurren en la mesa. Después, el dispositivo registra lo que ya se vio, permite corregirlo antes de confirmar y calcula el resultado con la puntuación existente. Si quedan pilas, la ronda siguiente vuelve a repartirse en secreto. Si no alcanzan, la partida termina y ganan quienes empatan en el máximo.

### Reglas compartidas con el online

Pilas, reparto, roles, conversación, cierre, voto, puntos, marcador y final son las secciones 4 a 12 y RF-001 a RF-018. La referencia implementada sigue en `backend/games/`. El teléfono no puede importar ese código.

### Diferencias

En el online cada teléfono es un miembro, con sala, token y socket. La mano, «¡Basta!» y la cuenta las lleva el servidor. Si al llegar a 0 alguien no envió elección, la ronda digital cierra igual y esa persona suma 0.

En el presencial hay una sola lista de nombres y no hay código de sala. La aplicación no pide manos ni «¡Basta!». La corrección de una elección es previa a la confirmación. El resultado muestra el mismo contenido de revelación: nombre, carta, gesto, señalados, puntos y una sola explicación.

### Pendiente

Siguen sin decidirse, y esta sección no los convierte en regla: el catálogo de 15 o 16 situaciones, si el dispositivo comprueba `L × 2 > N`, qué ocurre si falta un gesto al confirmar, señalar a tres o más personas, quién confirma, si durante la carga se muestran las cartas, el orden visual del marcador, el orden en que se pasa el teléfono y si una carta ya oculta puede verse otra vez. La carta visible al cerrar la aplicación, abandonar, reiniciar, descartar y el momento de borrar la partida terminada están en `docs/PERSISTENCIA_PRESENCIAL.md` como propuestas. La navegación está en `docs/NAVEGACION_PRESENCIAL.md`.

---

**Fin del documento.**