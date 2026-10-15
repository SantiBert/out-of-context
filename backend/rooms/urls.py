from django.urls import path

from rooms.views import (
    CastVoteView,
    CreateRoomView,
    JoinRoomView,
    OwnCardView,
    RoomDetailView,
    RoundResultsView,
    RoundStateView,
    ScoreboardView,
    StartRoomView,
)

urlpatterns = [
    path("rooms/", CreateRoomView.as_view(), name="room-create"),
    path("rooms/<str:code>/", RoomDetailView.as_view(), name="room-detail"),
    path("rooms/<str:code>/members/", JoinRoomView.as_view(), name="room-join"),
    path("rooms/<str:code>/start/", StartRoomView.as_view(), name="room-start"),
    path("rooms/<str:code>/round/", RoundStateView.as_view(), name="room-round"),
    path(
        "rooms/<str:code>/results/",
        RoundResultsView.as_view(),
        name="room-results",
    ),
    path("rooms/<str:code>/card/", OwnCardView.as_view(), name="room-card"),
    path("rooms/<str:code>/score/", ScoreboardView.as_view(), name="room-score"),
    path("rooms/<str:code>/vote/", CastVoteView.as_view(), name="room-vote"),
]
