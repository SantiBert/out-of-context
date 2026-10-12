from django.urls import path

from rooms.views import CreateRoomView, JoinRoomView, RoomDetailView

urlpatterns = [
    path("rooms/", CreateRoomView.as_view(), name="room-create"),
    path("rooms/<str:code>/", RoomDetailView.as_view(), name="room-detail"),
    path("rooms/<str:code>/members/", JoinRoomView.as_view(), name="room-join"),
]
