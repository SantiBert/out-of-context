from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from games.deck import InvalidRoundState
from games.scoring import InvalidVote
from rooms.serializers import (
    NameSerializer,
    OwnCardSerializer,
    RoomAccessSerializer,
    RoomErrorSerializer,
    RoomStateSerializer,
    RoundPublicSerializer,
    RoundResultSerializer,
    ScoreboardSerializer,
    VoteChoiceSerializer,
)
from rooms.service import (
    InvalidRoom,
    RoomError,
    cast_vote,
    connection_access,
    create_room,
    get_room_state,
    join_room,
    member_for_token,
    own_card,
    round_state,
    scoreboard,
    start_game,
    stored_results,
)

ERROR_STATUS = {
    "room_not_found": 404,
    "room_closed": 409,
    "room_full": 409,
    "duplicate_member": 409,
    "unauthorized": 401,
    "not_host": 403,
    "invalid_player_count": 409,
    "round_unavailable": 404,
    "card_unavailable": 404,
    "results_unavailable": 409,
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


class StartRoomView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses={
            200: RoomStateSerializer,
            401: RoomErrorSerializer,
            403: RoomErrorSerializer,
            404: RoomErrorSerializer,
            409: RoomErrorSerializer,
        },
    )
    def post(self, request, code):
        token = _request_token(request)
        denied = _authorize(code, token)
        if denied is not None:
            return denied
        member = member_for_token(code, token)
        if member is None:
            return Response(
                {
                    "code": "unauthorized",
                    "detail": "La conexión no está autorizada.",
                },
                status=401,
            )
        try:
            start_game(code, member.name)
            state = get_room_state(code)
        except (InvalidRoom, RoomError) as error:
            return room_error_response(error)
        return Response(public_state(state))


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


class RoundResultsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: RoundResultSerializer(many=True),
            401: RoomErrorSerializer,
            404: RoomErrorSerializer,
            409: RoomErrorSerializer,
        },
    )
    def get(self, request, code):
        denied = _authorize(code, _request_token(request))
        if denied is not None:
            return denied
        try:
            results = stored_results(code, _request_token(request))
        except RoomError as error:
            return room_error_response(error)
        serializer = RoundResultSerializer(data=results, many=True)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class ScoreboardView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: ScoreboardSerializer,
            401: RoomErrorSerializer,
            404: RoomErrorSerializer,
        },
    )
    def get(self, request, code):
        denied = _authorize(code, _request_token(request))
        if denied is not None:
            return denied
        try:
            board = scoreboard(code, _request_token(request))
        except RoomError as error:
            return room_error_response(error)
        serializer = ScoreboardSerializer(data=board)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class CastVoteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=VoteChoiceSerializer,
        responses={
            200: VoteChoiceSerializer,
            400: RoomErrorSerializer,
            401: RoomErrorSerializer,
            404: RoomErrorSerializer,
            409: RoomErrorSerializer,
        },
    )
    def post(self, request, code):
        token = _request_token(request)
        denied = _authorize(code, token)
        if denied is not None:
            return denied
        serializer = VoteChoiceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"code": "invalid_vote", "detail": "La elección no es válida."},
                status=400,
            )
        try:
            choice = cast_vote(
                code,
                token,
                serializer.validated_data["gesture"],
                serializer.validated_data["targets"],
            )
        except InvalidRoundState as error:
            return Response(
                {"code": "invalid_round", "detail": str(error)},
                status=409,
            )
        except InvalidVote as error:
            return Response({"code": "invalid_vote", "detail": str(error)}, status=409)
        except RoomError as error:
            return room_error_response(error)
        return Response(choice)


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
