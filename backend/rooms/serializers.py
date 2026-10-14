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


class RoundPublicSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    status = serializers.CharField()
    participant_ids = serializers.ListField(child=serializers.IntegerField())
    dealt_count = serializers.IntegerField()
    discard_count = serializers.IntegerField()
    ready_count = serializers.IntegerField()
    ready = serializers.ListField(child=serializers.CharField())
    vote_opened_at = serializers.DateTimeField(allow_null=True)
    vote_closes_at = serializers.DateTimeField(allow_null=True)
    vote_mark = serializers.IntegerField(allow_null=True, min_value=0, max_value=3)


class OwnCardSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    text = serializers.CharField()
