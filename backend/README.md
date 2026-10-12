# Backend

API de Out Of Context. El proyecto usa Django 6.1, Django REST Framework y Python 3.12. El gestor de dependencias es pip, con las versiones fijadas en `requirements.txt`. PostgreSQL corre en Docker Compose. Django Channels se prepara en OOC-002.5.

La configuración vive en `config/`. El endpoint de salud vive en `health/`. El dominio de la partida vive en `games/` y se incluye en `INSTALLED_APPS`.

## Requisitos

- Python 3.12.
- pip.

## Instalación

Desde la raíz del repositorio, copia la plantilla de entorno. El archivo `.env` no se versiona.

```powershell
Copy-Item .env.example .env
```

Desde `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

`requirements.txt` contiene las dependencias de ejecución. `requirements-dev.txt` añade Ruff y las incluye. En un entorno que solo ejecuta el servidor, basta `pip install -r requirements.txt`.

`DJANGO_SECRET_KEY` es obligatoria. Si falta, Django no arranca. `DJANGO_ALLOWED_HOSTS` y `DJANGO_DB_ENGINE` también son obligatorias. `DJANGO_DEBUG` vale `False` cuando la variable no está definida; un valor desconocido detiene el arranque. Los valores de `.env.example` son placeholders de desarrollo, no credenciales reales.

`DJANGO_DB_ENGINE=postgresql` es el entorno local cuando Django corre en el equipo. Compose publica la base en `127.0.0.1` y ese proceso usa `POSTGRES_HOST=localhost`. El nombre `postgres` solo resuelve dentro de la red de Compose. El servicio `backend` lo fija él mismo, junto con `DJANGO_DB_ENGINE=postgresql` y `POSTGRES_PORT=5432`, aunque `.env` use `sqlite`. Con `postgresql`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` y `POSTGRES_PORT` son obligatorias y el puerto debe estar entre 1 y 65535. Si Docker no está corriendo, `DJANGO_DB_ENGINE=sqlite` permite arrancar el proceso del equipo sin esa base. Django abre la base al arrancar porque comprueba migraciones, aunque el health check no la consulta.

Este archivo es solo del servidor. La URL que usa la aplicación móvil está en `mobile/.env` y no incluye claves del servidor.

## Modelo de dominio

`games` persiste cartas, copias, partidas, participantes y rondas. No hay vistas, serializers ni Channels.

- `SituationCard` guarda el número y el texto. No hay un catálogo cargado: el reglamento solo incluye cuatro ejemplos, no las 15 o 16 cartas.
- `CardCopy` representa las tres copias de un tipo, con índice 1, 2 o 3.
- `Participant` es un nombre único dentro de la partida. No hay `User`: la autenticación sigue abierta.
- `Room` es una sala distinta de la partida. Nace en `waiting` con un código de invitación único. `RoomMember` guarda el nombre visible y marca al creador como único anfitrión. Otro participante se incorpora con ese código mientras la sala espera, hasta 8 nombres distintos. Puede irse; el anfitrión no. La consulta devuelve ese estado público y no una partida. El anfitrión puede iniciar: se crea un `Game` en `preparing`, sin pilas ni ronda, y la sala pasa a `started`. No hay login ni endpoint de salas.
- `Game` usa `preparing`, `in_progress` y `finished`. Sale de la preparación con 4 a 8 participantes.
- `Round` usa `prepared`, `conversation`, `voting` y `finished`. La lista de diez fases de la arquitectura no se adoptó porque incluye la sala.
- `RoundPile` guarda también la partida para que un tipo de carta no se consuma dos veces en ella.
- `GamePile` es el conjunto de pilas de una partida. Quien prepara la partida pasa las cartas: el reglamento no lista las 15 o 16 situaciones ni dice cuál se omite entre 4 y 6 jugadores.
- `DealtHand` reparte una copia a un participante. El rol y el equipo no se guardan: se derivan de esas copias.
- `DiscardedCopy` guarda las copias que sobran en esa ronda. No es un estado de la copia en el catálogo: el descarte impide repartirla otra vez en la misma ronda, y la vista general de la ronda no incluye esas cartas ni las repartidas.

`deck_config` fija 15 pilas y 3 por ronda para 4 a 6 jugadores, y 16 pilas y 4 por ronda para 7 u 8. El máximo de rondas es 5 y 4. `prepare_round` elige las pilas, las mezcla y entrega una copia a cada jugador con un generador que las pruebas pueden fijar. La ronda pasa a `conversation`. Un segundo reparto en ese estado no cambia la ronda.

`classify_hands` agrupa solo las cartas repartidas. Dos o tres jugadores con la misma situación forman un equipo. Un jugador solo es impostor. Los impostores de situaciones distintas no forman un equipo. Una situación repartida cuatro veces se rechaza. `classify_round` lee las manos y no el descarte. La vista pública de la ronda no incluye esa clasificación.

`score_votes` calcula los puntos a partir de esa clasificación y de los votos, sin endpoints ni interfaz. Un jugador de equipo puntúa solo si señala exactamente a sus compañeros: un punto por cada compañero que lo incluyó, aunque el voto de ese compañero esté incompleto. El puño vale 1 si el jugador es impostor. La V vale 1 más un punto por cada señalamiento, y 0 si nadie lo señaló. Quien no es impostor y elige puño o V obtiene 0. No se puede votar dos veces, omitir un voto, usar otro gesto ni señalarse a uno mismo.

`Vote` guarda un gesto por participante y ronda. `VoteTarget` guarda a quién señaló. `ScoreAward` guarda los puntos de esa ronda. La puntuación de la partida es la suma de esos premios. `apply_round_scores` no cambia la fase y, si la ronda ya tiene premios, devuelve los mismos sin crear filas nuevas. `record_votes` tampoco duplica un voto idéntico.

No hay votación en tiempo real ni ganador de la partida. Siguen abiertas las decisiones del reglamento sobre el reparto digital, la conversación, el registro simultáneo de votos y los detalles de impostor que el texto no incluye.

## PostgreSQL

PostgreSQL y, si se elige, Django corren en Compose. El volumen `postgres_data` guarda los datos en `/var/lib/postgresql/data`. `docker compose down` conserva el volumen. `docker compose down -v` lo borra.

La contraseña de `.env` solo se aplica cuando el volumen se crea por primera vez. Si el volumen ya existe, PostgreSQL conserva la contraseña de esa inicialización. No borres el volumen para cambiarla salvo que quieras descartar los datos.

Desde la raíz del repositorio, con `.env` creado a partir de `.env.example`. Django en el equipo:

```powershell
docker compose up -d postgres
docker compose ps
```

`docker compose ps` muestra el estado. Postgres está listo cuando su healthcheck queda `healthy`.

Desde `backend/`, con `DJANGO_DB_ENGINE=postgresql`:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
```

Django en contenedor. La imagen está en `Dockerfile` y no migra al arrancar. Hay que reconstruirla cuando cambian `requirements.txt` o el código:

```powershell
docker compose build backend
docker compose up -d postgres
docker compose run --rm backend python manage.py migrate
docker compose up -d backend
docker compose logs backend
```

`docker compose up -d --build` hace el mismo rebuild antes de levantar. `migrate` aplica las migraciones de Django (`admin`, `auth`, `contenttypes` y `sessions`). No crea modelos del juego. Con el servicio `backend` en marcha, `GET http://127.0.0.1:8000/api/health/` responde `200` y `{"status": "ok"}`.

```powershell
docker compose run --rm backend python manage.py test
```

Para detener los contenedores sin borrar los datos:

```powershell
docker compose stop
```

`docker compose down` también conserva el volumen. No uses `docker compose down -v` si quieres mantener la base.

## Calidad

Ruff revisa y formatea el código. Las pruebas siguen el runner de Django. Pytest no se usa: duplicaría ese runner. `manage.py test` cambia la base a SQLite en memoria y no abre PostgreSQL ni sus datos.

Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m ruff format .
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

- `ruff check` es el lint.
- `ruff format --check` comprueba el formato sin modificar archivos.
- `ruff format` aplica el formato.
- `manage.py test` ejecuta las pruebas.
- `manage.py check` ejecuta las comprobaciones de Django.
- `makemigrations --check --dry-run` falla si hay cambios de modelo sin migración. No aplica migraciones. Django abre la base configurada para revisar el historial; si la contraseña del volumen no coincide, avisa y el comando puede terminar sin cambios de modelo.

Esos mismos comandos, salvo `ruff format`, corren en GitHub Actions. El workflow está en [.github/workflows/ci.yml](../.github/workflows/ci.yml). Allí `DJANGO_DB_ENGINE=sqlite` y la clave es el placeholder `ci-only-not-a-secret`. CI no abre el volumen de PostgreSQL.

## Convenciones

- Los módulos, las funciones y las variables usan snake_case.
- Las clases usan PascalCase.
- `config/` guarda la configuración. Cada aplicación de dominio es un paquete Django, como `health/`, y se agrega a `INSTALLED_APPS`.
- Las pruebas viven en `test*.py` dentro de la aplicación. Comprueban comportamiento con `SimpleTestCase` o `TestCase`. No se añaden pruebas que solo devuelvan éxito.
- Los imports van en tres grupos: biblioteca estándar, terceros y código propio.

## Comandos

Desde `backend/`, con el virtualenv creado:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py runserver
```

- `check` comprueba la configuración.
- `test` ejecuta las pruebas. No abren PostgreSQL.
- `runserver` inicia el servidor de desarrollo en `http://127.0.0.1:8000/`. Con PostgreSQL en marcha, las migraciones de las apps de Django ya pueden estar aplicadas. El health check no consulta la base.

## Dirección según el cliente

`localhost` no significa lo mismo en todos los entornos. `DJANGO_ALLOWED_HOSTS` debe incluir el host que usa el cliente.

- Misma máquina: `http://127.0.0.1:8000`, con `runserver`.
- Emulador Android: `http://10.0.2.2:8000`. Esa dirección llega al `127.0.0.1` del equipo de desarrollo. `10.0.2.2` está en el ejemplo de `DJANGO_ALLOWED_HOSTS`.
- Dispositivo físico: `http://<IP-LAN-del-equipo>:8000`, con el teléfono y el equipo en la misma red. El servidor se inicia con `runserver 0.0.0.0:8000` y esa IP se agrega a `DJANGO_ALLOWED_HOSTS`. Dentro del teléfono, `localhost` es el propio teléfono.

## Health check

`GET /api/health/`

Respuesta `200`:

```json
{"status": "ok"}
```

No requiere autenticación y no consulta la base de datos. Sirve para comprobar que el proceso responde.

## Swagger

Con el servidor en marcha:

- `GET http://127.0.0.1:8000/api/schema/` devuelve el contrato OpenAPI.
- `GET http://127.0.0.1:8000/api/schema/swagger-ui/` muestra Swagger.

Hoy el contrato documenta el health check y las salas: crear, consultar y unirse. Salir e iniciar no tienen ruta. No requiere autenticación. La interfaz carga sus archivos desde una CDN.
