# Out Of Context

Out Of Context es un juego social multijugador para Android. Cada jugador recibe una carta secreta, conversa para reconocer a su equipo y vota de forma simultánea. Quienes comparten la misma carta forman un equipo. Quienes reciben una carta única son impostores.

El cliente móvil está inicializado con Expo, React Native y TypeScript. El backend está inicializado con Django y Django REST Framework. PostgreSQL corre en Docker Compose. Django Channels está decidido como transporte en tiempo real y todavía no está instalado.

## Requisitos

- Python 3.12 y pip.
- Node.js y npm.
- Docker, para PostgreSQL.
- JDK y Android SDK, solo para `npm run android`.

## Estructura

```
.
├── mobile/              Cliente Expo, React Native y TypeScript.
├── backend/             API Django y Django REST Framework.
├── docs/                Arquitectura, reglas del juego y backlog.
├── .cursor/skills/      Instrucciones de trabajo del repositorio.
├── .gitignore
├── .env.example         Variables del servidor. Placeholders, no secretos reales.
├── docker-compose.yml   PostgreSQL 16.15 y el backend Django.
└── README.md
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) también prevé `contracts/` e `infra/`. Esas carpetas todavía no existen.

## Documentación

- [Cliente móvil](mobile/README.md)
- [Backend](backend/README.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Reglas del juego](docs/GAME_DESIGN_DOCUMENT.md)
- [Backlog](docs/BACKLOG.md)

## Instalación

Desde la raíz:

```powershell
Copy-Item .env.example .env
```

Desde `mobile/`:

```powershell
Copy-Item .env.example .env
npm install
```

Desde `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

`.env` y `mobile/.env` no se versionan. El de la raíz guarda `DJANGO_SECRET_KEY` y `POSTGRES_*`. El de `mobile/` solo guarda `EXPO_PUBLIC_API_URL`. Esa variable es pública: Expo la incluye en el bundle. No pongas ahí la clave de Django ni la contraseña de la base.

`.env.example` usa `DJANGO_DB_ENGINE=postgresql`. Si Docker no está corriendo, `sqlite` permite arrancar Django sin esa base. En este entorno el `.env` local sigue en `sqlite`.

## Arranque

Hay dos formas de levantar Django. Metro sigue en el equipo.

Django en el equipo usa `POSTGRES_HOST=localhost`. Compose publica PostgreSQL en `127.0.0.1`. El nombre `postgres` solo existe dentro de la red de Compose. Si Docker no está corriendo, `DJANGO_DB_ENGINE=sqlite` en `.env` arranca sin esa base.

```powershell
docker compose up -d postgres
docker compose ps
```

Desde `backend/`, con `DJANGO_DB_ENGINE=postgresql`:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Django en contenedor usa el servicio `backend`. Compose fija `DJANGO_DB_ENGINE=postgresql`, `POSTGRES_HOST=postgres` y `POSTGRES_PORT=5432`, aunque `.env` diga `sqlite` o `localhost`. La imagen no ejecuta migraciones al arrancar.

```powershell
docker compose build backend
docker compose up -d postgres
docker compose run --rm backend python manage.py migrate
docker compose up -d backend
docker compose logs backend
```

`docker compose build backend` y `docker compose up -d --build` reconstruyen la imagen cuando cambian `requirements.txt` o el código. `migrate` aplica las migraciones de Django (`admin`, `auth`, `contenttypes` y `sessions`). No crea modelos del juego. `GET /api/health/` responde `200` con `{"status": "ok"}` y no consulta la base. Desde el equipo: `http://127.0.0.1:8000/api/health/`.

Las pruebas dentro del contenedor tampoco abren PostgreSQL:

```powershell
docker compose run --rm backend python manage.py test
```

Desde `mobile/`:

```powershell
npm start
```

`npm start` inicia Metro. `npm run android` compila el development build con `expo run:android` y requiere JDK y Android SDK.

Para detener los contenedores sin borrar datos:

```powershell
docker compose stop
```

`docker compose down` también conserva el volumen `postgres_data`. `docker compose down -v` lo borra. La contraseña de `.env` solo se aplica cuando ese volumen se crea por primera vez.

## Calidad y pruebas

Ruff revisa el Python del backend. Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m ruff format .
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

`manage.py test` usa SQLite en memoria y no abre PostgreSQL. `makemigrations --check --dry-run` detecta migraciones pendientes de modelo y no las aplica. El detalle está en [backend/README.md](backend/README.md).

En el cliente, desde `mobile/`:

```powershell
npm test
npm run lint
npm run typecheck
npm run format:check
npm run format
```

- `npm test` ejecuta Jest.
- `npm run lint` ejecuta ESLint.
- `npm run typecheck` ejecuta `tsc --noEmit`.
- `npm run format:check` comprueba Prettier sin modificar archivos.
- `npm run format` aplica Prettier.

`package.json` también define `ios` y `web`. El producto previsto es Android. Esos dos scripts no forman parte de este flujo y no se han ejecutado.

## Integración continua

GitHub Actions ejecuta esas comprobaciones en [.github/workflows/ci.yml](.github/workflows/ci.yml), en cada push a `master` y en cada pull request. El job `mobile` corre en `mobile/`: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test`. El job `backend` corre en `backend/`: instalación con `requirements-dev.txt`, `ruff check`, `ruff format --check`, `manage.py check`, `manage.py test` y `makemigrations --check --dry-run`.

CI no usa secretos ni el volumen de PostgreSQL. Define `DJANGO_SECRET_KEY=ci-only-not-a-secret`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1` y `DJANGO_DB_ENGINE=sqlite`. Si cualquiera de esos comandos falla, el workflow falla. No publica builds ni despliega.

En local se usan los mismos comandos de esta sección. En Windows, el backend se invoca con `.\.venv\Scripts\python.exe` en lugar de `python`.

## URL del backend

La aplicación lee `EXPO_PUBLIC_API_URL` con `getApiBaseUrl()` en `mobile/src/config/env.ts`. La pantalla inicial todavía no llama al backend: la URL queda configurada, pero no hay integración funcional.

- Misma máquina: `http://127.0.0.1:8000`, con `runserver`.
- Emulador Android: `http://10.0.2.2:8000`. Esa dirección llega al `127.0.0.1` del equipo. `10.0.2.2` está en `DJANGO_ALLOWED_HOSTS` del ejemplo.
- Dispositivo físico, en la misma red: `http://<IP-LAN-del-equipo>:8000`. Django se inicia con `runserver 0.0.0.0:8000` y esa IP se agrega a `DJANGO_ALLOWED_HOSTS`. Dentro del teléfono, `localhost` es el propio teléfono.

Si la variable falta o no es una URL `http` o `https`, el error pide copiar `mobile/.env.example` y reiniciar Metro.

## Limitaciones conocidas

- Django Channels no está instalado. La arquitectura lo reserva para el tiempo real.
- El cliente no consume todavía `GET /api/health/` ni ningún otro endpoint.
- En este entorno, `manage.py migrate` no se completó ni en el equipo ni en el contenedor `backend`. El proceso llega a PostgreSQL, y el volumen `postgres_data` rechaza la contraseña del placeholder. No se borró el volumen. Además, `127.0.0.1:8000` ya estaba ocupado, así que el servicio `backend` no llegó a publicar el health check.
- `npm run android` no se ejecutó: este entorno no tiene JDK ni Android SDK. Tampoco se probó un emulador ni un dispositivo físico.
