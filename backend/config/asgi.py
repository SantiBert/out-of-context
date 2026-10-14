"""
ASGI config for config project.

HTTP stays on Django. WebSocket traffic goes to the realtime routes.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_application = get_asgi_application()


def _application():
    from channels.routing import ProtocolTypeRouter

    from realtime.routing import websocket_application

    return ProtocolTypeRouter(
        {
            "http": django_application,
            "websocket": websocket_application,
        }
    )


application = _application()
