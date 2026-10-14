from django.core.exceptions import ImproperlyConfigured

_TRUE_VALUES = {"1", "true", "yes", "on"}
_FALSE_VALUES = {"0", "false", "no", "off"}


def require_secret_key(value):
    secret = (value or "").strip()
    if not secret:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY es obligatoria. "
            "Copia .env.example a .env en la raíz del repositorio."
        )
    return secret


def parse_debug(value):
    if value is None or not value.strip():
        return False
    normalized = value.strip().lower()
    if normalized in _TRUE_VALUES:
        return True
    if normalized in _FALSE_VALUES:
        return False
    raise ImproperlyConfigured(
        "DJANGO_DEBUG debe ser true o false. También se aceptan 1/0, yes/no y on/off."
    )


def parse_allowed_hosts(value):
    hosts = [host.strip() for host in (value or "").split(",") if host.strip()]
    if not hosts:
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS es obligatoria. "
            "Indica al menos un host, separado por comas."
        )
    return hosts


def database_from_env(environ, base_dir):
    engine = (environ.get("DJANGO_DB_ENGINE") or "").strip().lower()
    if engine == "sqlite":
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": base_dir / "db.sqlite3",
        }
    if engine == "postgresql":
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _require_postgres("POSTGRES_DB", environ.get("POSTGRES_DB")),
            "USER": _require_postgres("POSTGRES_USER", environ.get("POSTGRES_USER")),
            "PASSWORD": _require_postgres(
                "POSTGRES_PASSWORD", environ.get("POSTGRES_PASSWORD")
            ),
            "HOST": _require_postgres("POSTGRES_HOST", environ.get("POSTGRES_HOST")),
            "PORT": _parse_port(environ.get("POSTGRES_PORT")),
            "OPTIONS": {
                "connect_timeout": 3,
            },
        }
    if not engine:
        raise ImproperlyConfigured(
            'DJANGO_DB_ENGINE es obligatoria. Usa "sqlite" o "postgresql".'
        )
    raise ImproperlyConfigured('DJANGO_DB_ENGINE debe ser "sqlite" o "postgresql".')


def _require_postgres(name, value):
    text = (value or "").strip()
    if not text:
        raise ImproperlyConfigured(
            f"{name} es obligatoria cuando DJANGO_DB_ENGINE=postgresql."
        )
    return text


def channel_layer_from_env(environ):
    url = (environ.get("REDIS_URL") or "").strip()
    if not url.startswith(("redis://", "rediss://")):
        raise ImproperlyConfigured(
            "REDIS_URL es obligatoria y debe empezar por redis:// o rediss://."
        )
    return {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [url]},
        }
    }


def _parse_port(value):
    text = (value or "").strip()
    if not text.isdigit():
        raise ImproperlyConfigured("POSTGRES_PORT debe ser un entero entre 1 y 65535.")
    port = int(text)
    if port < 1 or port > 65535:
        raise ImproperlyConfigured("POSTGRES_PORT debe ser un entero entre 1 y 65535.")
    return str(port)
