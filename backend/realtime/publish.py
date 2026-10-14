import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from realtime.consumers import room_group_name
from realtime.serializers import encode_server_event

logger = logging.getLogger(__name__)


def publish_room_events(code, events):
    try:
        encoded = [
            encode_server_event(event_type, payload) for event_type, payload in events
        ]
        layer = get_channel_layer()
        if layer is None:
            logger.error("No hay channel layer para publicar la sala %s.", code)
            return
        group = room_group_name(code)
        for event in encoded:
            async_to_sync(layer.group_send)(
                group,
                {"type": "room.broadcast", "message": event},
            )
    except Exception:
        logger.exception("No se publicaron los eventos de la sala %s.", code)
