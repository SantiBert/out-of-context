# Salas

No hay autenticación de usuario. Un nombre en el cuerpo registra a quien entra en la sala; no demuestra que quien llama sea un participante ya existente. Crear y unirse devuelven, una sola vez, un `token` de ese miembro. Consultar la sala no lo incluye. Salir e iniciar una partida no tienen ruta.

La respuesta pública tiene `code`, `status`, `host`, `participants`, `player_count`, `accepting_members` y `can_start`. No incluye la clave interna, el token, la partida, cartas, roles ni votos.

Un error tiene `code` y `detail`.

## Crear una sala

- Método y ruta: `POST /api/rooms/`
- Autenticación: ninguna.
- Permisos: cualquiera. El nombre queda como anfitrión de una sala nueva.
- Cuerpo: `{"name": "<texto>"}`.
- Respuesta `201`: el estado público y `token`. La sala nace en `waiting`. El servidor guarda solo el hash del token.
- Errores: `400` `invalid_room` si el nombre falta, está vacío o no cabe.
- Efecto: crea una sala y su anfitrión. No crea una partida.
- Idempotencia: cada llamada crea otra sala.

## Consultar una sala

- Método y ruta: `GET /api/rooms/{code}/`
- Autenticación: ninguna.
- Permisos: quien tiene el código ve la misma representación.
- Cuerpo: ninguno. El código se recorta y se pasa a mayúsculas.
- Respuesta `200`: el estado público.
- Errores: `404` `room_not_found`.
- Efecto: ninguno.
- Idempotencia: la lectura no cambia la sala.

## Unirse a una sala

- Método y ruta: `POST /api/rooms/{code}/members/`
- Autenticación: ninguna.
- Permisos: cualquiera puede registrar un nombre que todavía no esté, mientras la sala espera y no está llena. No hay permiso de anfitrión ni de miembro porque no hay identidad.
- Cuerpo: `{"name": "<texto>"}`.
- Respuesta `201`: el estado público, con el nuevo participante, y el `token` de ese miembro.
- Errores: `400` `invalid_room`, `404` `room_not_found`, `409` `room_closed`, `409` `room_full`, `409` `duplicate_member`.
- Efecto: añade un miembro. No reparte cartas.
- Idempotencia: repetir el mismo nombre responde `409` y no añade otro miembro.

## Bloqueadas

`POST /api/rooms/{code}/leave/` y `POST /api/rooms/{code}/start/` no existen. Abandonar la sala e iniciar la partida siguen en el dominio. El token no abre esas rutas; solo abre el socket de la sala.

## Consultar la ronda

- Método y ruta: `GET /api/rooms/{code}/round/?token=`
- Autenticación: el `token` emitido al crear o al unirse. Un nombre o un id de jugador no lo sustituyen.
- Permisos: un miembro de esa sala.
- Cuerpo: ninguno.
- Respuesta `200`: `number`, `status`, `participant_ids`, `dealt_count`, `discard_count`, `ready_count`, `ready`, `vote_opened_at`, `vote_closes_at` y `vote_mark`. `ready` son los nombres con la mano levantada. En `voting` no incluye cartas, gestos ni puntos. En `finished` añade `results`: `name`, `card`, `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. Quien no eligió trae `gesture` null y `targets` vacío.
- Errores: `401` `unauthorized`, `404` `room_not_found`, `404` `round_unavailable`.
- Efecto: ninguno. Sirve para recuperar el estado público después de reconectar.
- Idempotencia: la lectura no cambia la ronda.

## Consultar la carta propia

- Método y ruta: `GET /api/rooms/{code}/card/?token=`
- Autenticación: el mismo `token`.
- Permisos: el miembro de esa sala. La respuesta es solo su carta.
- Cuerpo: ninguno.
- Respuesta `200`: `number` y `text`.
- Errores: `401` `unauthorized`, `404` `room_not_found`, `404` `card_unavailable`.
- Efecto: ninguno.
- Idempotencia: la lectura no reparte.

`GET /api/rooms/{code}/` sigue sin token y sin carta. Levantar la mano y «¡Basta!» no tienen ruta: van por el socket.

## Registrar una elección

- Método y ruta: `POST /api/rooms/{code}/vote/?token=`
- Autenticación: el mismo `token`. Un nombre, un id de jugador o el token de otra sala no lo sustituyen.
- Permisos: un miembro de esa sala, con la ronda en `voting` y `vote_closes_at` todavía en el futuro.
- Cuerpo: `{"gesture": "point", "targets": ["<nombre>", ...]}` o `{"gesture": "fist", "targets": []}` o `{"gesture": "v", "targets": []}`. `point` nombra al menos a otro participante de esa partida. `fist` y `v` no nombran a nadie. No hay `role` ni `player_id`.
- Respuesta `200`: `gesture` y `targets`, solo para quien llama. `targets` vuelve ordenado por nombre.
- Errores: `400` `invalid_vote` si el cuerpo no tiene esa forma; `401` `unauthorized`; `404` `room_not_found` o `round_unavailable`; `409` `invalid_round` si la fase o el plazo no admiten la elección; `409` `invalid_vote` si el objetivo no sirve o esa persona ya eligió otra cosa.
- Efecto: guarda una fila `Vote` de ese miembro. No publica un evento, no muestra la elección en el `GET` de la ronda ni en el de la sala, y no calcula puntos.
- Idempotencia: repetir la misma elección devuelve la misma. Una distinta responde `409` y no la cambia.

Ejemplo de señalar:

```json
{"gesture": "point", "targets": ["Luis"]}
```

Ejemplo de puño:

```json
{"gesture": "fist", "targets": []}
```

La respuesta `200` repite ese cuerpo, con `targets` ordenado por nombre. Un campo `points`, `role` o `player_id` responde `400` `invalid_vote`.

## Consultar resultados

- Método y ruta: `GET /api/rooms/{code}/results/?token=`
- Autenticación: el mismo `token`.
- Permisos: un miembro de esa sala.
- Cuerpo: ninguno.
- Respuesta `200`: la lista ya revelada. Cada entrada trae `name`, `card`, `gesture`, `targets`, `points` y `recognized_by` o `pointed_by`. Solo cuando la ronda está `finished` y los premios ya están guardados. Quien no eligió trae `gesture` null, `targets` vacío y `points` 0.
- Errores: `401` `unauthorized`; `404` `room_not_found` o `round_unavailable`; `409` `results_unavailable` mientras no haya revelación guardada. Ese cuerpo es solo `code` y `detail`.
- Efecto: ninguno. No lee la papeleta para calcular, no llama a `apply_round_scores` y no publica.
- Idempotencia: repetir la lectura devuelve el mismo resultado guardado.
