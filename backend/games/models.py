from django.core.exceptions import ValidationError
from django.db import models

MIN_PLAYERS = 4
MAX_PLAYERS = 8
COPIES_PER_CARD = 3


class ValidatedModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class SituationCard(ValidatedModel):
    number = models.PositiveSmallIntegerField(unique=True)
    text = models.TextField()

    def __str__(self):
        return f"#{self.number}"


class CardCopy(ValidatedModel):
    card = models.ForeignKey(
        SituationCard,
        on_delete=models.CASCADE,
        related_name="copies",
    )
    copy_number = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["card", "copy_number"],
                name="unique_card_copy",
            ),
            models.CheckConstraint(
                condition=models.Q(copy_number__gte=1)
                & models.Q(copy_number__lte=COPIES_PER_CARD),
                name="card_copy_number_between_1_and_3",
            ),
        ]

    def __str__(self):
        return f"#{self.card.number} copia {self.copy_number}"


class Game(ValidatedModel):
    class Status(models.TextChoices):
        PREPARING = "preparing", "preparing"
        IN_PROGRESS = "in_progress", "in_progress"
        FINISHED = "finished", "finished"

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PREPARING,
    )

    def clean(self):
        if self.status == self.Status.PREPARING:
            return
        count = self.participants.count() if self.pk else 0
        if count < MIN_PLAYERS or count > MAX_PLAYERS:
            raise ValidationError(
                "Una partida en curso o terminada tiene entre 4 y 8 participantes."
            )


class Participant(ValidatedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    name = models.CharField(max_length=80)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "name"],
                name="unique_participant_name_per_game",
            ),
        ]

    def clean(self):
        others = Participant.objects.filter(game=self.game)
        if self.pk:
            others = others.exclude(pk=self.pk)
        if others.count() >= MAX_PLAYERS:
            raise ValidationError("Una partida admite como máximo 8 participantes.")

    def __str__(self):
        return self.name


class GamePile(ValidatedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="piles",
    )
    card = models.ForeignKey(
        SituationCard,
        on_delete=models.PROTECT,
        related_name="game_piles",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "card"],
                name="unique_game_pile",
            ),
        ]


class Round(ValidatedModel):
    class Status(models.TextChoices):
        PREPARED = "prepared", "prepared"
        CONVERSATION = "conversation", "conversation"
        VOTING = "voting", "voting"
        FINISHED = "finished", "finished"

    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="rounds",
    )
    number = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PREPARED,
    )
    vote_opened_at = models.DateTimeField(null=True, blank=True)
    vote_closes_at = models.DateTimeField(null=True, blank=True)
    vote_mark = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "number"],
                name="unique_round_number_per_game",
            ),
            models.CheckConstraint(
                condition=models.Q(number__gte=1),
                name="round_number_at_least_1",
            ),
        ]

    def dealt_copies(self):
        return CardCopy.objects.filter(dealt_hands__round=self)

    def discard_copies(self):
        return CardCopy.objects.filter(card__round_piles__round=self).exclude(
            pk__in=self.dealt_copies().values("pk")
        )


class RoundReady(ValidatedModel):
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="readies",
    )
    participant = models.ForeignKey(
        "Participant",
        on_delete=models.CASCADE,
        related_name="readies",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "participant"],
                name="unique_ready_per_round",
            ),
        ]

    def clean(self):
        if self.round_id and self.participant_id:
            if self.participant.game_id != self.round.game_id:
                raise ValidationError("El jugador no está en la partida de la ronda.")


class RoundPile(ValidatedModel):
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="consumed_piles",
    )
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="piles",
    )
    card = models.ForeignKey(
        SituationCard,
        on_delete=models.PROTECT,
        related_name="round_piles",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "card"],
                name="unique_pile_per_round",
            ),
            models.UniqueConstraint(
                fields=["game", "card"],
                name="unique_pile_per_game",
            ),
        ]

    def clean(self):
        if self.round_id and self.game_id and self.round.game_id != self.game_id:
            raise ValidationError("La pila debe pertenecer a la partida de la ronda.")


class DealtHand(ValidatedModel):
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="dealt_hands",
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="dealt_hands",
    )
    card_copy = models.ForeignKey(
        CardCopy,
        on_delete=models.PROTECT,
        related_name="dealt_hands",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "participant"],
                name="unique_hand_per_participant_round",
            ),
            models.UniqueConstraint(
                fields=["round", "card_copy"],
                name="unique_copy_per_round",
            ),
        ]

    def clean(self):
        if self.participant.game_id != self.round.game_id:
            raise ValidationError(
                "El participante no pertenece a la partida de la ronda."
            )
        pile_exists = RoundPile.objects.filter(
            round=self.round,
            card=self.card_copy.card,
        ).exists()
        if not pile_exists:
            raise ValidationError("La copia no pertenece a una pila de la ronda.")
        if DiscardedCopy.objects.filter(
            round=self.round,
            card_copy=self.card_copy,
        ).exists():
            raise ValidationError("La copia ya está en el descarte de la ronda.")


class DiscardedCopy(ValidatedModel):
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="discards",
    )
    card_copy = models.ForeignKey(
        CardCopy,
        on_delete=models.PROTECT,
        related_name="discards",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "card_copy"],
                name="unique_discard_per_round",
            ),
        ]

    def clean(self):
        pile_exists = RoundPile.objects.filter(
            round=self.round,
            card=self.card_copy.card,
        ).exists()
        if not pile_exists:
            raise ValidationError("La copia no pertenece a una pila de la ronda.")
        if DealtHand.objects.filter(
            round=self.round,
            card_copy=self.card_copy,
        ).exists():
            raise ValidationError("La copia ya fue repartida en la ronda.")


class Vote(ValidatedModel):
    class Gesture(models.TextChoices):
        FIST = "fist", "fist"
        V = "v", "v"
        POINT = "point", "point"

    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    gesture = models.CharField(max_length=8, choices=Gesture.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "participant"],
                name="unique_vote_per_participant_round",
            ),
        ]

    def clean(self):
        if self.participant.game_id != self.round.game_id:
            raise ValidationError(
                "El participante no pertenece a la partida de la ronda."
            )


class VoteTarget(ValidatedModel):
    vote = models.ForeignKey(
        Vote,
        on_delete=models.CASCADE,
        related_name="targets",
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="received_targets",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["vote", "participant"],
                name="unique_target_per_vote",
            ),
        ]

    def clean(self):
        if self.participant_id == self.vote.participant_id:
            raise ValidationError("Un jugador no puede señalarse a sí mismo.")
        if self.participant.game_id != self.vote.round.game_id:
            raise ValidationError("El objetivo no pertenece a la partida de la ronda.")


class ScoreAward(ValidatedModel):
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="score_awards",
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="score_awards",
    )
    points = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "participant"],
                name="unique_score_per_participant_round",
            ),
        ]

    def clean(self):
        if self.participant.game_id != self.round.game_id:
            raise ValidationError(
                "El participante no pertenece a la partida de la ronda."
            )
