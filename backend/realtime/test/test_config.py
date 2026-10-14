from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from config.env import channel_layer_from_env


class ChannelLayerConfigTests(SimpleTestCase):
    def test_a_redis_url_selects_the_redis_layer(self):
        layer = channel_layer_from_env({"REDIS_URL": "redis://localhost:6379/0"})

        self.assertEqual(
            layer["default"]["BACKEND"],
            "channels_redis.core.RedisChannelLayer",
        )
        self.assertEqual(
            layer["default"]["CONFIG"]["hosts"], ["redis://localhost:6379/0"]
        )

    def test_a_secure_redis_url_is_accepted(self):
        layer = channel_layer_from_env({"REDIS_URL": "rediss://example.test:6380/1"})

        self.assertEqual(
            layer["default"]["CONFIG"]["hosts"], ["rediss://example.test:6380/1"]
        )

    def test_a_missing_or_invalid_url_is_rejected(self):
        for environ in ({}, {"REDIS_URL": "http://localhost:6379"}):
            with self.subTest(environ=environ):
                with self.assertRaises(ImproperlyConfigured):
                    channel_layer_from_env(environ)
