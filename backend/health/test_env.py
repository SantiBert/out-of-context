from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from config.env import (
    database_from_env,
    parse_allowed_hosts,
    parse_debug,
    require_secret_key,
)


class EnvironmentConfigurationTests(SimpleTestCase):
    def test_secret_key_is_required(self):
        with self.assertRaisesMessage(
            ImproperlyConfigured, "DJANGO_SECRET_KEY es obligatoria"
        ):
            require_secret_key("  ")

    def test_debug_defaults_to_false_and_rejects_unknown_values(self):
        self.assertIs(parse_debug(None), False)
        self.assertIs(parse_debug("yes"), True)
        self.assertIs(parse_debug("off"), False)
        with self.assertRaisesMessage(
            ImproperlyConfigured, "DJANGO_DEBUG debe ser true o false"
        ):
            parse_debug("maybe")

    def test_allowed_hosts_require_at_least_one_host(self):
        self.assertEqual(
            parse_allowed_hosts("localhost, 10.0.2.2"), ["localhost", "10.0.2.2"]
        )
        with self.assertRaisesMessage(
            ImproperlyConfigured, "DJANGO_ALLOWED_HOSTS es obligatoria"
        ):
            parse_allowed_hosts(" , ")

    def test_database_engine_is_required(self):
        with self.assertRaisesMessage(
            ImproperlyConfigured, "DJANGO_DB_ENGINE es obligatoria"
        ):
            database_from_env({}, base_dir="/tmp")

    def test_sqlite_does_not_require_postgres_settings(self):
        config = database_from_env(
            {"DJANGO_DB_ENGINE": "sqlite"}, base_dir=Path("/tmp")
        )

        self.assertEqual(config["ENGINE"], "django.db.backends.sqlite3")
        self.assertEqual(config["NAME"], Path("/tmp") / "db.sqlite3")

    def test_postgresql_requires_connection_settings_and_a_valid_port(self):
        with self.assertRaisesMessage(
            ImproperlyConfigured, "POSTGRES_PASSWORD es obligatoria"
        ):
            database_from_env(
                {
                    "DJANGO_DB_ENGINE": "postgresql",
                    "POSTGRES_DB": "out_of_context",
                    "POSTGRES_USER": "out_of_context",
                    "POSTGRES_HOST": "localhost",
                    "POSTGRES_PORT": "5432",
                },
                base_dir="/tmp",
            )

        with self.assertRaisesMessage(
            ImproperlyConfigured, "POSTGRES_PORT debe ser un entero"
        ):
            database_from_env(
                {
                    "DJANGO_DB_ENGINE": "postgresql",
                    "POSTGRES_DB": "out_of_context",
                    "POSTGRES_USER": "out_of_context",
                    "POSTGRES_PASSWORD": "change-me",
                    "POSTGRES_HOST": "localhost",
                    "POSTGRES_PORT": "70000",
                },
                base_dir="/tmp",
            )
