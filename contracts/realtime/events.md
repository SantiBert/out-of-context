# Eventos WebSocket

Todo mensaje es un objeto JSON con `type` y `payload`. No hay otros campos. El cliente no envía comandos: unirse, salir e iniciar exigirían demostrar quién llama, y esa identidad sigue abierta. Un mensaje del cliente no cambia la sala ni la partida.

`ws/health/` no emite estos eventos.

Los tipos de sala y `connection.error` los emite solo el servidor. El payload de sala usa el estado público: `code`, `status`, `host`, `participants`, `player_count`, `accepting_members` y `can_start`. No incluye la clave del modelo, cartas, roles ni votos. `player_count` coincide con `participants` y `host` está en esa lista. `round.phase_changed` también lo emite solo el servidor y no lleva la carta.

## room.snapshot

- Dirección: servidor al cliente.
- Propósito: entregar el estado público actual.
- Payload: el estado público.
- Cuándo se emite: después de que `create_room` confirma la sala, y cuando un socket presenta el token de un miembro de esa sala. El payload se vuelve a leer de la base.

## room.player_joined

- Dirección: servidor al cliente.
- Propósito: avisar que entró un nombre visible.
- Payload: el estado público más `name`, el nombre que ahora está en `participants`.
- Cuándo se emite: después de que `join_room` confirma el alta. Si con esa alta cambian `accepting_members` o `can_start`, también se emite `room.state_changed`.

## room.player_left

- Dirección: servidor al cliente.
- Propósito: avisar que salió un nombre visible.
- Payload: el estado público más `name`, el nombre que ya no está en `participants`.
- Cuándo se emite: después de que `leave_room` confirma la salida. Si con esa salida cambian `accepting_members` o `can_start`, también se emite `room.state_changed`.

## room.state_changed

- Dirección: servidor al cliente.
- Propósito: avisar que cambió `status`, `accepting_members` o `can_start`.
- Payload: el estado público resultante.
- Cuándo se emite: cuando un alta, una baja o el inicio cambian `status`, `accepting_members` o `can_start`.

## game.started

- Dirección: servidor al cliente.
- Propósito: avisar que la sala pasó a partida.
- Payload: el estado público después de iniciar. No incluye el id de `Game`.
- Cuándo se emite: después de que `start_game` crea la partida. También se emite `room.state_changed`. Repetir el inicio no emite nada. El cliente no puede iniciar por este evento.

## round.phase_changed

- Dirección: servidor al cliente.
- Propósito: avisar que la ronda abierta cambió de fase.
- Payload: `code`, `number`, `status`, `dealt_count` y `discard_count`. No incluye cartas, descartes, roles, token ni la clave de la ronda.
- Cuándo se emite: después de que `begin_conversation` confirma el reparto (`status` `conversation`) y después de que `call_basta` confirma el cierre (`status` `voting`). El payload se vuelve a leer de la base. Repetir la llamada no emite otra vez. El cliente no puede declarar esta fase: ese mensaje es `server_only` y no cambia la ronda.

## round.hand_raised

- Dirección: servidor al cliente.
- Propósito: avisar que un miembro levantó la mano.
- Payload: `code`, `number`, `name`, `ready_count` y `player_count`. No incluye cartas, roles, token ni un umbral declarado por el cliente.
- Cuándo se emite: después de que `raise_hand` registra esa mano por primera vez en la ronda. Repetirla no emite. El conteo lo calcula el servidor con `L × 2 > N`. El cliente no puede anunciar la mano: ese mensaje es `server_only`.

## round.countdown

- Dirección: servidor al cliente.
- Propósito: mostrar la cuenta 3, 2, 1, 0 mientras la recepción sigue abierta.
- Payload: `code`, `number`, `mark`, `opened_at` y `closes_at`. No incluye gesto, objetivo, carta, rol ni puntos.
- Cuándo se emite: al pasar a `voting` sale el 3. Cada número dura un segundo y el 0 coincide con `closes_at`, tres segundos después de `opened_at`. Una marca ya emitida no se repite. Repetir «¡Basta!» o reconectar no reinicia el plazo. El cliente no puede declarar la cuenta, la revelación ni una puntuación: esos mensajes son `server_only`. El cierre autorizado es `closes_at`, aunque el evento llegue después.

```json
{
  "type": "round.countdown",
  "payload": {
    "code": "AB12CD",
    "number": 1,
    "mark": 3,
    "opened_at": "2026-10-14T03:00:00+00:00",
    "closes_at": "2026-10-14T03:00:03+00:00"
  }
}
```

## round.revealed

- Dirección: servidor al cliente.
- Propósito: mostrar las cartas, los gestos y los puntos cuando la votación ya cerró.
- Payload: `code`, `number` y `results`. Cada entrada, ordenada por nombre, trae `name`, `card` (`number` y `text`), `gesture`, `targets`, `points` y una sola explicación: `recognized_by` si pertenece a un equipo, o `pointed_by` si es impostor. No incluye token, clave del modelo ni id de participante.
- Cuándo se emite: después de que `close_vote` confirma los premios y deja la ronda en `finished`, en el mismo envío que la marca 0 y que `round.phase_changed`. `round.phase_changed` sigue sin cartas. Repetir el cierre no emite otra vez. El cliente no puede declarar la revelación: ese mensaje es `server_only`. Si falta una elección, la marca 0 sale igual y esa persona aparece con `gesture` null, `targets` vacío y `points` 0.

## connection.error

- Dirección: servidor al cliente.
- Propósito: rechazar un mensaje.
- Payload: `code` y `detail`.
- Códigos: `invalid_message`, `unknown_type`, `server_only`, `room_not_found`, `unauthorized`, `invalid_round`, `not_ready` y `round_unavailable`.
- Cuándo se emite: si falta `type` o `payload`, el tipo no existe, el payload trae campos, el cliente envía un evento de servidor, la fase no admite la acción, no hay mayoría o no hay ronda. El socket sigue abierto, salvo `room_not_found` y `unauthorized` al conectar o cuando el miembro ya no está.

## Comandos del cliente

Solo hay dos. El `payload` va vacío. La identidad es el `token` de la conexión, no un campo del mensaje. La elección no es un comando: se envía con `POST /api/rooms/{code}/vote/?token=`.

- `round.raise_hand`: pide `raise_hand`. Si es la primera vez, la sala recibe `round.hand_raised`.
- `round.basta`: pide `call_basta`. Si el servidor calcula mayoría, la sala recibe `round.phase_changed` con `voting`.

Un `round.hand_raised`, `round.phase_changed`, `round.countdown` o `round.revealed` entrante es `server_only` y no cambia la ronda. Estos comandos no envían la carta. Si el socket no vio la cuenta, `GET /api/rooms/{code}/round/` devuelve `vote_opened_at`, `vote_closes_at` y la marca del reloj del servidor. Ese `GET` incluye `results` solo cuando la ronda está `finished`. `GET /api/rooms/{code}/card/` sigue siendo solo la carta propia.

La cuenta y el cambio de fase no llevan gestos ni puntos. `round.revealed` sí. La conversación no tiene chat.
