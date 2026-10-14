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
- Un mensaje del cliente no cambia la sala ni la partida. Si el miembro sigue en la base, el servidor responde `connection.error` y mantiene el socket. Si ya no está, lo saca del grupo, responde `unauthorized` y cierra. Un canal cerrado no recibe eventos.
- Si Redis o el envío fallan, la operación ya confirmada no se deshace y el fallo queda en el log. No hay una cola en memoria. Si el socket no está, el cliente recupera el estado con `GET /api/rooms/<code>/`.
- El cliente tiene que guardar el token: el servidor no lo vuelve a mostrar. Si lo pierde, el nombre sigue ocupado y no hay forma de recuperarlo. No hay indicador de presencia ni expiración. Durante una votación este snapshot no trae cartas ni votos; esa reconexión queda para el flujo de la partida.
- Fuera de las pruebas, el channel layer es Redis (`REDIS_URL`). `manage.py test` usa una capa en memoria y no abre Redis. Esa capa cubre el reparto dentro de un proceso, el aislamiento entre salas y un envío que falla. No cubre Redis de verdad: dos procesos, la caducidad de los canales ni `docker compose`.
