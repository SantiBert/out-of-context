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


class OwnCardSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    text = serializers.CharField()


class RoundResultSerializer(serializers.Serializer):
    name = serializers.CharField()
    card = OwnCardSerializer()
    gesture = serializers.CharField(allow_null=True)
    targets = serializers.ListField(child=serializers.CharField())
    points = serializers.IntegerField(min_value=0)
    recognized_by = serializers.ListField(child=serializers.CharField(), required=False)
    pointed_by = serializers.ListField(child=serializers.CharField(), required=False)


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
    results = RoundResultSerializer(many=True, required=False)


class VoteChoiceSerializer(serializers.Serializer):
    gesture = serializers.ChoiceField(choices=("point", "fist", "v"))
    targets = serializers.ListField(child=serializers.CharField(), allow_empty=True)

    def validate(self, attrs):
        unknown = set(self.initial_data) - {"gesture", "targets"}
        if unknown:
            raise serializers.ValidationError("El mensaje incluye campos no públicos.")
        gesture = attrs["gesture"]
        targets = attrs["targets"]
        if gesture == "point" and not targets:
            raise serializers.ValidationError(
                "El gesto de señalar exige al menos un jugador."
            )
        if gesture in ("fist", "v") and targets:
            raise serializers.ValidationError("El puño y la V no señalan jugadores.")
        return attrs
