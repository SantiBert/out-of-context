from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.serializers import NameSerializer, RoomErrorSerializer, RoomStateSerializer
from rooms.service import (
    InvalidRoom,
    RoomError,
    create_room,
    get_room_state,
    join_room,
)

ERROR_STATUS = {
    "room_not_found": 404,
    "room_closed": 409,
    "room_full": 409,
    "duplicate_member": 409,
}


def invalid_name_response():
    return Response(
        {"code": "invalid_room", "detail": "El nombre no puede estar vacío."},
        status=400,
    )


def room_error_response(error):
    if isinstance(error, InvalidRoom):
        return Response({"code": "invalid_room", "detail": str(error)}, status=400)
    return Response(
        {"code": error.code, "detail": str(error)},
        status=ERROR_STATUS.get(error.code, 400),
    )


def public_state(state):
    return RoomStateSerializer(state._asdict()).data


class CreateRoomView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=NameSerializer,
        responses={201: RoomStateSerializer, 400: RoomErrorSerializer},
    )
    def post(self, request):
        serializer = NameSerializer(data=request.data)
        if not serializer.is_valid():
            return invalid_name_response()
        try:
            room = create_room(serializer.validated_data["name"])
            state = get_room_state(room.code)
        except (InvalidRoom, RoomError) as error:
            return room_error_response(error)
        return Response(public_state(state), status=201)


class RoomDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses={200: RoomStateSerializer, 404: RoomErrorSerializer})
    def get(self, request, code):
        try:
            state = get_room_state(code)
        except RoomError as error:
            return room_error_response(error)
        return Response(public_state(state))


class JoinRoomView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=NameSerializer,
        responses={
            201: RoomStateSerializer,
            400: RoomErrorSerializer,
            404: RoomErrorSerializer,
            409: RoomErrorSerializer,
        },
    )
    def post(self, request, code):
        serializer = NameSerializer(data=request.data)
        if not serializer.is_valid():
            return invalid_name_response()
        try:
            join_room(code, serializer.validated_data["name"])
            state = get_room_state(code)
        except (InvalidRoom, RoomError) as error:
            return room_error_response(error)
        return Response(public_state(state), status=201)
