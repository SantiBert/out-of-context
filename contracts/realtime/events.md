# Eventos WebSocket

Todo mensaje es un objeto JSON con `type` y `payload`. No hay otros campos. El cliente no envía comandos: unirse, salir e iniciar exigirían demostrar quién llama, y esa identidad sigue abierta. Un mensaje del cliente no cambia la sala ni la partida.

`ws/health/` no emite estos eventos.

Los seis tipos los emite solo el servidor. El payload de sala usa el estado público: `code`, `status`, `host`, `participants`, `player_count`, `accepting_members` y `can_start`. No incluye la clave del modelo, cartas, roles ni votos. `player_count` coincide con `participants` y `host` está en esa lista.

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

## connection.error

- Dirección: servidor al cliente.
- Propósito: rechazar un mensaje.
- Payload: `code` y `detail`.
- Códigos: `invalid_message`, `unknown_type`, `server_only`, `room_not_found` y `unauthorized`.
- Cuándo se emitiría: si falta `type` o `payload`, el tipo no existe, el payload no es válido o el cliente envía un evento de servidor.

No hay rondas ni votación. No hay comandos del cliente hasta que exista un mecanismo de identidad.
