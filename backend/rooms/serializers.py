from rest_framework import serializers


class NameSerializer(serializers.Serializer):
    name = serializers.CharField(allow_blank=True)


class RoomStateSerializer(serializers.Serializer):
    code = serializers.CharField()
    status = serializers.CharField()
    host = serializers.CharField()
    participants = serializers.ListField(child=serializers.CharField())
    player_count = serializers.IntegerField()
    accepting_members = serializers.BooleanField()
    can_start = serializers.BooleanField()


class RoomAccessSerializer(RoomStateSerializer):
    token = serializers.CharField()


class RoomErrorSerializer(serializers.Serializer):
    code = serializers.CharField()
    detail = serializers.CharField()
