from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.serializers import (
    NameSerializer,
    OwnCardSerializer,
    RoomAccessSerializer,
    RoomErrorSerializer,
    RoomStateSerializer,
    RoundPublicSerializer,
)
from rooms.service import (
    InvalidRoom,
    RoomError,
    connection_access,
    create_room,
    get_room_state,
    join_room,
    own_card,
    round_state,
)

ERROR_STATUS = {
    "room_not_found": 404,
    "room_closed": 409,
    "room_full": 409,
    "duplicate_member": 409,
    "unauthorized": 401,
    "round_unavailable": 404,
    "card_unavailable": 404,
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


def access_state(state, token):
    payload = state._asdict()
    payload["participants"] = list(state.participants)
    payload["token"] = token
    serializer = RoomAccessSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    return serializer.data


class CreateRoomView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=NameSerializer,
        responses={201: RoomAccessSerializer, 400: RoomErrorSerializer},
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
        return Response(access_state(state, room.access_token), status=201)


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
            201: RoomAccessSerializer,
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
            member = join_room(code, serializer.validated_data["name"])
            state = get_room_state(code)
        except (InvalidRoom, RoomError) as error:
            return room_error_response(error)
        return Response(access_state(state, member.access_token), status=201)


class RoundStateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: RoundPublicSerializer,
            401: RoomErrorSerializer,
            404: RoomErrorSerializer,
        },
    )
    def get(self, request, code):
        denied = _authorize(code, _request_token(request))
        if denied is not None:
            return denied
        try:
            view = round_state(code, _request_token(request))
        except RoomError as error:
            return room_error_response(error)
        serializer = RoundPublicSerializer(data=view)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class OwnCardView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: OwnCardSerializer,
            401: RoomErrorSerializer,
            404: RoomErrorSerializer,
        },
    )
    def get(self, request, code):
        denied = _authorize(code, _request_token(request))
        if denied is not None:
            return denied
        try:
            card = own_card(code, _request_token(request))
        except RoomError as error:
            return room_error_response(error)
        serializer = OwnCardSerializer(data=card)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


def _request_token(request):
    values = request.query_params.getlist("token")
    if len(values) != 1 or not values[0]:
        return ""
    return values[0]


def _authorize(code, token):
    try:
        get_room_state(code)
    except RoomError as error:
        return room_error_response(error)
    if connection_access(code, token) != "ok":
        return Response(
            {"code": "unauthorized", "detail": "La conexión no está autorizada."},
            status=401,
        )
    return None
