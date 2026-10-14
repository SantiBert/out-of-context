from django.urls import path

from rooms.views import (
    CreateRoomView,
    JoinRoomView,
    OwnCardView,
    RoomDetailView,
    RoundStateView,
)

urlpatterns = [
    path("rooms/", CreateRoomView.as_view(), name="room-create"),
    path("rooms/<str:code>/", RoomDetailView.as_view(), name="room-detail"),
    path("rooms/<str:code>/members/", JoinRoomView.as_view(), name="room-join"),
    path("rooms/<str:code>/round/", RoundStateView.as_view(), name="room-round"),
    path("rooms/<str:code>/card/", OwnCardView.as_view(), name="room-card"),
]
