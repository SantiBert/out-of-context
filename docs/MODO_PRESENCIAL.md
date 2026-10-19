# Modo presencial de un solo dispositivo

Definición funcional. Reutiliza el reglamento de `docs/GAME_DESIGN_DOCUMENT.md` y el dominio ya implementado. No agrega reglas nuevas ni endpoints. Cómo correr sin backend, con una copia acotada del núcleo puro, está en `docs/ARQUITECTURA_PRESENCIAL.md`. Qué se guarda de la partida activa, cómo se reanuda y qué sigue sin decidir al cerrar el teléfono está en `docs/PERSISTENCIA_PRESENCIAL.md`. Qué pantalla corresponde a cada fase, y qué avance no está permitido, está en `docs/NAVEGACION_PRESENCIAL.md`.

La épica de este modo es OOC-015 en `docs/BACKLOG.md`. OOC-010 sigue siendo la integración del cliente con el backend. La auditoría de reutilización es OOC-015.1. Este texto no autoriza implementación.

El reparto, los roles, la mayoría, el voto y los puntos ya están en `backend/games/deck.py`, `roles.py`, `rounds.py`, `voting.py` y `scoring.py`. Esas decisiones siguen siendo la referencia. El teléfono no puede importarlas. La copia permitida es solo el núcleo puro descrito en `docs/ARQUITECTURA_PRESENCIAL.md`.

## Flujo

1. Una persona crea la partida en el dispositivo y anota los nombres, de 4 a 8. Con esa lista se preparan las pilas: 15 si hay 4–6 jugadores y 16 si hay 7–8. Cada pila son tres copias de una situación. Las pilas se eligen sin mostrarlas.
2. Cada ronda toma al azar 3 pilas (4–6 jugadores) o 4 pilas (7–8). Se mezclan, se reparte una carta boca abajo a cada jugador y el resto queda en el descarte. El rol sale solo de las cartas repartidas: la misma carta en dos o tres manos es un equipo; una carta única es impostor. Puede haber cero, uno o varios impostores. El dispositivo no anuncia el rol.
3. El dispositivo muestra el número y el texto de un solo jugador. Una acción explícita oculta esa carta. Recién entonces se puede mostrar la del siguiente. Mientras la carta está visible, no se muestran las demás.
4. Cuando todos vieron y ocultaron la suya, la conversación ocurre en la mesa. No hay turnos, chat ni temporizador. Está prohibido decir el número o el texto de la carta. La aplicación no exige manos levantadas ni «¡Basta!».
5. La mesa vota como en el juego físico: cuentan de 3 a 0, al llegar a 0 hacen el gesto a la vez y mantienen el gesto mientras muestran las cartas. Nadie se abstiene. Después, el dispositivo registra lo que ya se vio.
6. Cada jugador queda con una de las tres elecciones ya existentes. Quien cree tener equipo señala a otros jugadores: al menos a otro participante, nunca a sí mismo y sin repetir un nombre. Quien cree ser impostor elige puño (seguro) o V (arriesgar), sin objetivos. El dispositivo no decide cuál de las tres es la correcta ni calcula el rol para habilitar una u otra.
7. Antes de confirmar, se puede revisar y cambiar cualquier elección. Confirmar es el momento en que entra en la puntuación existente. Hasta entonces el cambio no es un voto distinto ya guardado.
8. La puntuación es la de la sección 10 del reglamento. Equipo: puntos solo si señaló a todos sus compañeros y a nadie más; entonces, un punto por cada compañero que también lo señaló, aunque ese compañero haya señalado de más o de menos. El puño y la V no señalan. Impostor con puño: 1 punto. Impostor con V: 1 más uno por cada jugador que lo señaló, si alguien lo señaló; si nadie, 0. Quien hace puño o V y no es impostor: 0. El orden en que se cargaron las elecciones no cambia el resultado.
9. El resultado muestra, por jugador, el nombre, la carta, el gesto, los señalados, los puntos y una sola explicación: reconocido por o señalado por. El marcador suma esos puntos al total ya acumulado, como número persistente. Si quedan pilas para otra ronda, se prepara y se reparte de nuevo, otra vez en secreto. Las pilas ya usadas y el descarte no vuelven al mazo.
10. Si no quedan pilas suficientes para otra ronda, la partida termina. Ganan quienes tienen el total más alto. Si varios empatan, comparten la victoria. No hay desempate ni revancha en el reglamento.

Con 4–6 jugadores el material alcanza 5 rondas; con 7–8, 4. Esa cuenta coincide con las pilas por ronda. El dominio rechaza otra ronda con `InsufficientPiles` cuando se llega a ese tope o cuando las pilas libres no alcanzan.

## Reglas reutilizadas

- Jugadores, pilas y reparto: secciones 4 y 5, y RF-001 a RF-005.
- Roles: sección 6 y RF-006 a RF-009. No se mira el descarte ni las copias no repartidas.
- Conversación: sección 7. Sin turnos y sin decir el número ni el texto. Las preguntas de ejemplo no son obligatorias.
- Cierre físico de la conversación: sección 8, `L × 2 > N` y «¡Basta!». En 4–8 jugadores hacen falta 3, 3, 4, 4 y 5 manos.
- Voto físico: sección 9, pasos 1 a 4, y las secciones 9.1 y 9.2.
- Puntos: sección 10, incluida la aclaración de que un compañero cuenta si señaló a ese jugador aunque su propia identificación esté incompleta.
- Marcador digital: sección 11. Un número acumulado, sin cartas físicas como fichas.
- Siguiente ronda y final: sección 12 y RF-016 a RF-018.

## Diferencias con el modo online

En el online cada teléfono es un miembro, con su token y un socket. Crear y unirse usan un código de sala. El anfitrión inicia. La mano y «¡Basta!» se envían por el socket. La cuenta 3-2-1-0 la lleva el servidor. El voto se envía con `POST /api/rooms/{code}/vote/?token=` y, una vez guardada, otra elección distinta se rechaza. Si al llegar a 0 alguien no envió nada, la ronda digital cierra igual: gesto nulo, sin objetivos y 0 puntos. La carta propia se pide con el token de ese miembro. `begin_conversation` no tiene ruta, y `start_game` no arma pilas ni reparte. Ningún servicio pasa la partida a `finished`; los ganadores del marcador solo aparecen si ese estado ya está guardado.

En el presencial hay un solo dispositivo y una sola lista de nombres. No hace falta que otra persona se una desde otro teléfono. La conversación y el gesto ocurren en la mesa. El dispositivo muestra cada carta en privado, la oculta con una acción explícita y solo después anota las elecciones. La corrección es previa a la confirmación. El resultado y el total usan la misma puntuación y el mismo contenido de revelación. La ronda siguiente sale de las pilas que todavía no se usaron.

## Validaciones y errores

Se rechaza un nombre vacío, un nombre que solo tiene espacios y un nombre de más de 80 caracteres. Un nombre repetido en la misma partida no entra. Con menos de 4 o más de 8 nombres no se reparte.

Señalar sin objetivos, señalarse a sí mismo o repetir un objetivo no es una elección válida. El puño y la V no llevan objetivos. Esas son las mismas comprobaciones de `submit_vote`.

No se confirma la puntuación si falta una elección o si alguna no pasa esas comprobaciones. No se abre otra ronda mientras la anterior no esté puntuada. No se abre otra si la partida ya terminó o si no alcanzan las pilas. Un resultado repetido no suma otra vez los mismos puntos.

Mientras se mira una carta, el dispositivo no muestra otra. Después de ocultarla, el número y el texto dejan de verse. El descarte y las manos ajenas no se usan para decir el rol antes de la revelación.

## Pendiente de confirmación

- El reglamento y OOC-010 no dicen si dos jugadores pueden llamarse igual, ni si un cambio de mayúsculas es el mismo nombre. No se unen las mayúsculas. El mismo texto ya recortado no entra, como quedó escrito en las validaciones de este modo.
- El reglamento no dice el orden en que se pasa el teléfono, si se puede volver a ver la propia carta después de ocultarla, ni qué pasa si se intenta conversar antes de que todos la hayan ocultado.
- La sección 15 deja abierta la interfaz de la conversación presencial. Este modo no obliga a registrar manos ni «¡Basta!» en la aplicación. Falta confirmar si el dispositivo debe comprobar `L × 2 > N` o si le basta con que la mesa ya haya cerrado.
- La partida digital perdona a quien no votó. El juego físico no permite abstenerse. Falta confirmar qué hace el dispositivo si, al confirmar, falta el gesto de alguien.
- El gesto físico describe un dedo o dos. El voto ya implementado acepta señalar a cualquier conjunto no vacío de otros jugadores. Falta confirmar si señalar a tres o más se rechaza en la carga o se registra y la puntuación lo resuelve.
- Falta confirmar quién pulsa confirmar, si la confirmación de todas las elecciones es indivisible y qué se muestra si falla a la mitad. Después de confirmada, el dominio no sustituye una elección por otra distinta.
- Falta confirmar si, durante la carga, el dispositivo muestra las cartas ya reveladas en la mesa o solo los nombres y los gestos.
- El GDD no fija el orden de la lista del marcador. Sí fija que el ganador es quien tiene más puntos y que el empate es victoria compartida. Falta confirmar el orden visual de los nombres.
- `backend/cards.json` es el mazo de 36 situaciones. `load_cards` las guarda en `SituationCard` con tres copias. La partida presencial sortea 15 o 16 de ese archivo, sin el servidor. `start_game` sigue sin llamar a `create_piles`. La sección 15.1 sigue pendiente si el mazo físico no es este archivo.
- No está definido si esta partida sigue viviendo en el servidor, con sala y token, o en el dispositivo. La arquitectura no admite una segunda copia de las reglas en TypeScript. Tampoco hay una ruta para salir ni una sesión con varios nombres en un teléfono.
- No está definido sacar o renombrar jugadores después del reparto. En el online, la sala iniciada no acepta incorporaciones.
- Bajar la mano no está definido. Este modo no lo agrega.
- Las cartas de información y el código QR quedan fuera de las reglas de la ronda. Su lugar en esta pantalla no está definido.
- No hay regla de revancha. No se ofrece.
