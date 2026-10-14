from channels.routing import URLRouter
from django.urls import path

from realtime.consumers import HealthConsumer, RoomConsumer

websocket_urlpatterns = [
    path("ws/health/", HealthConsumer.as_asgi()),
    path("ws/rooms/<str:code>/", RoomConsumer.as_asgi()),
]


class SocketRouter(URLRouter):
    async def __call__(self, scope, receive, send):
        try:
            return await super().__call__(scope, receive, send)
        except ValueError:
            if scope["type"] == "websocket":
                await send({"type": "websocket.close"})
                return
            raise


websocket_application = SocketRouter(websocket_urlpatterns)
