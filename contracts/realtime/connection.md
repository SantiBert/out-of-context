# Conexión WebSocket

No hay eventos de juego en esta ruta. El contrato de los eventos de sala está en `events.md`.

- Ruta: `ws://<host>/ws/health/`
- Autenticación: ninguna. No identifica a un jugador ni a una sala.
- Al conectar: el servidor acepta. No envía datos.
- Al cerrar: no cambia partidas, salas ni cartas.
- Otra ruta no conecta.

## Sala

- Ruta: `ws://<host>/ws/rooms/<code>/`
- El código de la ruta es la única sala que el servidor considera. `group`, `name` y `player_id` no eligen un grupo ni demuestran quién llama.
- El acceso es el `token` devuelto al crear o al unirse, en el parámetro `token`. El servidor lo compara con el hash guardado en ese miembro.
- Si el código no existe, el servidor envía `connection.error` con `room_not_found` y cierra. No entra en un grupo.
- Si el token falta, es de otra sala o el miembro ya no está, envía `unauthorized` y cierra. No entra en un grupo.
- Si el token corresponde a un miembro de esa sala, entra solo en `room.<code>` y recibe `room.snapshot` leído de la base. El error y el snapshot no llevan el token.
- Al cerrar, el canal sale de ese grupo. Eso no abandona la sala ni borra la partida. Otra conexión con el mismo token vuelve a entrar y recibe otro snapshot. No crea un participante ni una partida. Una segunda conexión abierta no cierra la primera.
- `round.raise_hand` y `round.basta`, con el `payload` vacío, delegan en el dominio. El resto de los mensajes no cambia la sala. Si el miembro sigue en la base, un fallo responde `connection.error` y mantiene el socket. Si ya no está, lo saca del grupo, responde `unauthorized` y cierra. Un canal cerrado no recibe eventos.
- Si Redis o el envío fallan, la operación ya confirmada no se deshace y el fallo queda en el log. No hay una cola en memoria. Si el socket no está, el cliente recupera la sala con `GET /api/rooms/<code>/`, la ronda con `GET /api/rooms/<code>/round/?token=` y su carta con `GET /api/rooms/<code>/card/?token=`.
- El cliente tiene que guardar el token: el servidor no lo vuelve a mostrar. Si lo pierde, el nombre sigue ocupado y no hay forma de recuperarlo. No hay indicador de presencia ni expiración. El snapshot de la sala no trae cartas ni votos. La carta se vuelve a pedir con el GET privado.

## Cliente

Hay un solo socket por sesión. `unauthorized` y `room_not_found` no se reintentan. Cualquier otro corte admite 3 reintentos automáticos, con espera de 1 s, 2 s y 4 s. Si un intento llega a abrir, el contador vuelve a cero. Si los tres fallan, la pantalla queda en «Sin conexión» y Reintentar empieza de nuevo.

Al pasar a vivo se vuelve a pedir `GET /api/rooms/{code}/`. La pantalla visible repite su lectura: ronda, carta propia, resultados o marcador. Un mensaje de una conexión ya cerrada no reemplaza ese estado. La fase de una misma ronda no retrocede.

No se reenvían solos el inicio, `round.raise_hand`, `round.basta` ni el voto. Si ¡Basta! se envió y la conexión cayó antes de confirmarse, queda en duda hasta que la persona lo reintenta o el `GET` ya dice `voting`. El voto dudoso se reenvía solo si la persona pulsa Reintentar y la ronda sigue en `voting`.
- Fuera de las pruebas, el channel layer es Redis (`REDIS_URL`). `manage.py test` usa una capa en memoria y no abre Redis. Esa capa cubre el reparto dentro de un proceso, el aislamiento entre salas y un envío que falla. No cubre Redis de verdad: dos procesos, la caducidad de los canales ni `docker compose`.
