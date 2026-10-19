# Ciclo de vida y persistencia presencial

Especificación revisable, registrada como OOC-015.4. No implementa el almacenamiento ni agrega librerías. El flujo está en [MODO_PRESENCIAL.md](MODO_PRESENCIAL.md) y la forma del documento en [ARQUITECTURA_PRESENCIAL.md](ARQUITECTURA_PRESENCIAL.md).

Decisión confirmada: hay una sola partida activa. Cerrar y volver a abrir la aplicación la reanuda. Una partida terminada no se archiva.

El archivo es distinto de `ooc.guest.session`. El token online no entra en él. Lo escribe solo el módulo de partida, detrás de `LocalMatchStorage`. El medio sigue siendo un JSON, sin paquete nuevo.

## Qué hay que guardar

Sin estos datos no se puede continuar la misma partida:

- `version`. Hoy sería `1`.
- Jugadores, en el orden en que se anotaron, con un identificador estable y el nombre.
- Las situaciones de las pilas de esta partida y cuáles ya se usaron.
- Cada ronda: número, cartas repartidas por jugador, descarte, borradores de voto y, si ya se confirmó, puntos y explicación.
- La fase de la interfaz: `setup`, `viewing`, `conversation`, `recording`, `results` o `finished`.
- En `viewing`: qué jugador corresponde y si la carta estaba oculta. Guardar el dato no decide si al restaurar se muestra.

No hace falta un listado de partidas viejas. El total no se guarda aparte: es la suma de los puntos ya confirmados de cada ronda. Los ganadores se calculan al terminar, cuando ya no hay pilas.

## Cuándo guardar

Se guarda al completar una acción aceptada, no en cada tecla. Eso cubre: nombre aceptado, reparto, ocultar carta, pasar al siguiente, pasar a conversación, abrir la carga, cambiar un borrador válido, confirmar, abrir la ronda siguiente y llegar al marcador final.

El reemplazo del archivo debe dejar el documento anterior intacto si la escritura se corta. Confirmar no queda a medias: o el archivo sigue en `recording` con los borradores, o pasa a `results` con los puntos. Repetir confirmar sobre una ronda ya guardada no suma otra vez.

Lo que todavía no se aceptó, un nombre a medio escribir o una elección inválida, no entra en el archivo. Si la aplicación se cierra ahí, ese tramo se pierde. El progreso aceptado permanece.

## Al abrir la aplicación

Si no hay archivo, el presencial no tiene partida. El online no se entera.

Si el archivo es la versión 1 y el parser lo acepta, se abre la fase guardada. No se reparte de nuevo ni se vuelven a calcular puntos ya confirmados.

Si el archivo no se puede usar, no se reanuda. El tratamiento está más abajo.

## Reanudar cada fase

- `setup`: siguen los nombres ya aceptados. Se puede seguir anotando. No hay cartas.
- `viewing` con la carta guardada como oculta: el mismo jugador, sin número ni texto, hasta que haya una acción explícita. El reglamento no dice si esa persona puede volver a verla. Sigue pendiente.
- `conversation`: la mesa, sin carta en pantalla. Las cartas repartidas siguen en el archivo.
- `recording`: los borradores aceptados vuelven a poder editarse. No están confirmados.
- `results`: el resultado ya guardado. No se vuelve a puntuar. Desde ahí se sigue a la carta de la ronda siguiente o al final, según las pilas.
- `finished`: el marcador final sigue siendo la partida activa hasta que la persona lo cierra. Al cerrarlo se borra el archivo. No queda historial. Si se prefiere borrar en el instante en que la partida pasa a `finished`, al reabrir no estaría el marcador. Eso es decisión de producto; la recomendación técnica es borrarlo al salir de esa pantalla, para poder reanudar el resultado.

## Cierre con una carta visible

La arquitectura proponía restaurar la carta oculta. Esta especificación no lo da por cerrado. Son alternativas de producto:

- Restaurar visible. Quien abra el teléfono ve el número y el texto. No se pierde el lugar de la lectura. Se expone la carta a otra persona.
- Restaurar oculta y permitir mostrarla otra vez con una acción explícita. Quien abra el teléfono no la ve. La misma persona puede leerla de nuevo. El reglamento no dice si eso está permitido.
- Restaurar oculta y no dejar mostrarla de nuevo. Quien no alcanzó a leerla pierde la carta. Nadie más la ve en el teléfono.

La técnica puede guardar el indicador en los tres casos. La elección no sale del GDD. La pantalla de carta guarda si está visible solo en memoria, siempre empieza oculta al reanudar y se cubre al ir a segundo plano sin avanzar el turno. No hay archivo de la partida en disco por defecto, así que cerrar el proceso no restaura una carta visible. Cerrar la votación también queda solo en memoria: cerrar la aplicación no restaura ese cierre ni elige una política de reanudación.

## Otras fases al cerrar

Tampoco están decididas. Consecuencias:

- Durante `recording`, la pantalla pide Continuar antes de mostrar gestos ya cargados. La carga no muestra el número ni el texto de la carta. La mesa, según la sección 9 del reglamento, ya mostró gestos y cartas en físico.
- Durante `results` o `finished`, las cartas de esa ronda ya son resultado. Mostrarlas al reanudar no adelanta una carta de la ronda siguiente.
- Durante `conversation`, no hay carta en pantalla. Reanudar no revela una mano.
- Un corte antes de que el archivo nuevo reemplace al anterior deja la acción sin guardar. No corrompe la partida aceptada.

## Abandonar, reiniciar y descartar

El reglamento no define estas acciones. Propuesta, pendiente de producto:

- Abandonar pide confirmación, borra el documento activo y la copia en memoria, invalida la recuperación cacheada y vuelve al inicio. Cancelar no escribe. La partida no se puede reanudar.
- Reiniciar pide confirmación, conserva los mismos jugadores en el mismo orden y reemplaza el documento activo por un reparto nuevo: sin puntos, votos ni pilas consumidas. Cancelar no escribe. No es abandonar.
- Volver a jugar, solo desde el marcador final, usa el mismo reemplazo que reiniciar: una sola clave activa, sin historial, y abre Carta.
- Cambiar jugadores, solo desde el marcador final, pide confirmación y reemplaza el documento activo por un setup con los mismos nombres y orden, sin pilas, rondas, votos ni puntos. La lista vuelve a ser editable. Cancelar no escribe.
- Descartar, ante un archivo inválido, también lo borra. Sin eso, un archivo ilegible impediría empezar otra.

No hay archivo de deshecho ni historial de partidas.

## Al terminar

Cuando la persona sale del marcador final, el archivo se borra. No se copia a otro sitio. La próxima entrada al presencial no encuentra partida.

Los puntos, las cartas y los ganadores dejan de estar en el dispositivo. El reglamento no pide conservarlos.

## Datos inválidos o de otra versión

No se corrige el JSON a mano ni se rellena un campo faltante. Una versión distinta de 1 no se migra: no hay funciones de migración. Se muestra que la partida no se puede reanudar y el archivo queda donde está, hasta que la persona lo descarte.

Un documento que dice versión 1 pero trae un gesto desconocido, un jugador repetido, una carta que no está en sus pilas o una fase que no existe, se trata igual: no se carga. No se reparte una partida nueva encima sin descartar antes.

## Pendiente

- Producto: cuál de las tres alternativas de la carta visible al reanudar.
- Producto: si quien ya ocultó su carta puede volver a verla.
- Producto: si al reanudar la carga la cubierta Continuar debe pedirse también tras un cambio de aplicación sin remount.
- Producto: borrar el archivo al salir del marcador final, o en el momento en que la partida pasa a `finished`.
- Producto: el nombre de descartar. Abandonar, reiniciar, volver a jugar y cambiar jugadores ya piden confirmación.
- Técnico, ya alineado con la arquitectura: un solo archivo, escritura que no pisa el anterior si se corta, confirmar en un solo reemplazo, sin historial y sin mezclar el token online.
- Siguen abiertos, y esta especificación no los cierra: el catálogo de 15 o 16 situaciones, comprobar `L × 2 > N`, señalar a tres o más, el orden visual del marcador y quién confirma.
