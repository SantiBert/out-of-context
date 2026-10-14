from django.core.exceptions import ValidationError
from django.db import models

NAME_MAX_LENGTH = 80
MIN_ROOM_MEMBERS = 4
MAX_ROOM_MEMBERS = 8


class ValidatedModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Room(ValidatedModel):
    class Status(models.TextChoices):
        WAITING = "waiting", "waiting"
        STARTED = "started", "started"

    code = models.CharField(max_length=6, unique=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.WAITING,
    )
    game = models.OneToOneField(
        "games.Game",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="room",
    )


class RoomMember(ValidatedModel):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="members",
    )
    name = models.CharField(max_length=NAME_MAX_LENGTH)
    is_host = models.BooleanField(default=False)
    token_hash = models.CharField(max_length=64, unique=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "name"],
                name="unique_member_name_per_room",
            ),
            models.UniqueConstraint(
                fields=["room"],
                condition=models.Q(is_host=True),
                name="unique_host_per_room",
            ),
        ]

    def clean(self):
        if not self.name or not self.name.strip():
            raise ValidationError("El nombre no puede estar vacío.")
        if self.name != self.name.strip():
            raise ValidationError("El nombre no puede tener espacios alrededor.")
        if len(self.name) > NAME_MAX_LENGTH:
            raise ValidationError("El nombre admite como máximo 80 caracteres.")
        if not self.is_host or not self.room_id:
            return
        hosts = RoomMember.objects.filter(room_id=self.room_id, is_host=True)
        if self.pk:
            hosts = hosts.exclude(pk=self.pk)
        if hosts.exists():
            raise ValidationError("La sala ya tiene un anfitrión.")
