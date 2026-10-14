from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.test import SimpleTestCase

from config.asgi import application


class HealthSocketTests(SimpleTestCase):
    def test_the_health_socket_connects_and_disconnects(self):
        async_to_sync(self._connect_and_disconnect)()

    async def _connect_and_disconnect(self):
        communicator = WebsocketCommunicator(application, "/ws/health/")
        connected, _subprotocol = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    def test_an_unknown_socket_does_not_connect(self):
        async_to_sync(self._reject_unknown)()

    async def _reject_unknown(self):
        communicator = WebsocketCommunicator(application, "/ws/unknown/")
        connected, _subprotocol = await communicator.connect()
        self.assertFalse(connected)
