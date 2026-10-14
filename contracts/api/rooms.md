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
