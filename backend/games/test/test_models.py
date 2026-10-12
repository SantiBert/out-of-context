from django.core.exceptions import ValidationError
from django.test import TestCase

from games.models import (
    CardCopy,
    DealtHand,
    DiscardedCopy,
    Game,
    Participant,
    Round,
    RoundPile,
    SituationCard,
)


def make_card(number, text="Una situación."):
    card = SituationCard.objects.create(number=number, text=text)
    copies = [
        CardCopy.objects.create(card=card, copy_number=index) for index in (1, 2, 3)
    ]
    return card, copies


class SituationCardTests(TestCase):
    def test_card_stores_number_and_text(self):
        card = SituationCard.objects.create(number=1, text="Lenguaje sofisticado.")

        self.assertEqual(card.number, 1)
        self.assertEqual(card.text, "Lenguaje sofisticado.")

    def test_card_number_is_unique(self):
        SituationCard.objects.create(number=1, text="Primera.")

        with self.assertRaises(ValidationError):
            SituationCard.objects.create(number=1, text="Otra.")


class CardCopyTests(TestCase):
    def test_a_card_has_three_copies(self):
        card, copies = make_card(1)

        self.assertEqual(card.copies.count(), 3)
        self.assertEqual([copy.copy_number for copy in copies], [1, 2, 3])

    def test_copy_number_cannot_repeat(self):
        card, _copies = make_card(1)

        with self.assertRaises(ValidationError):
            CardCopy.objects.create(card=card, copy_number=1)

    def test_copy_number_cannot_exceed_three(self):
        card, _copies = make_card(1)

        with self.assertRaises(ValidationError):
            CardCopy.objects.create(card=card, copy_number=4)


class GameAndParticipantTests(TestCase):
    def test_names_are_unique_inside_a_game(self):
        game = Game.objects.create()
        Participant.objects.create(game=game, name="Ana")

        with self.assertRaises(ValidationError):
            Participant.objects.create(game=game, name="Ana")

    def test_the_same_name_can_exist_in_another_game(self):
        first = Game.objects.create()
        second = Game.objects.create()
        Participant.objects.create(game=first, name="Ana")
        Participant.objects.create(game=second, name="Ana")

        self.assertEqual(Participant.objects.filter(name="Ana").count(), 2)

    def test_a_ninth_participant_is_rejected(self):
        game = Game.objects.create()
        for index in range(8):
            Participant.objects.create(game=game, name=f"Jugador {index}")

        with self.assertRaises(ValidationError):
            Participant.objects.create(game=game, name="Jugador 9")

    def test_in_progress_game_requires_between_four_and_eight_players(self):
        game = Game.objects.create()
        for index in range(3):
            Participant.objects.create(game=game, name=f"Jugador {index}")
        game.status = Game.Status.IN_PROGRESS

        with self.assertRaises(ValidationError):
            game.save()

    def test_in_progress_game_accepts_four_players(self):
        game = Game.objects.create()
        for index in range(4):
            Participant.objects.create(game=game, name=f"Jugador {index}")
        game.status = Game.Status.IN_PROGRESS
        game.save()

        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.IN_PROGRESS)

    def test_an_in_progress_game_accepts_eight_players(self):
        game = Game.objects.create()
        for index in range(8):
            Participant.objects.create(game=game, name=f"Jugador {index}")
        game.status = Game.Status.IN_PROGRESS
        game.save()

        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.IN_PROGRESS)

    def test_a_finished_game_rejects_three_players(self):
        game = Game.objects.create()
        for index in range(3):
            Participant.objects.create(game=game, name=f"Jugador {index}")
        game.status = Game.Status.FINISHED

        with self.assertRaises(ValidationError):
            game.save()


class RoundTests(TestCase):
    def setUp(self):
        self.game = Game.objects.create()
        self.participant = Participant.objects.create(game=self.game, name="Ana")
        self.card, self.copies = make_card(1)
        self.round = Round.objects.create(game=self.game, number=1)
        RoundPile.objects.create(game=self.game, round=self.round, card=self.card)

    def test_round_number_is_unique_per_game(self):
        with self.assertRaises(ValidationError):
            Round.objects.create(game=self.game, number=1)

    def test_a_pile_cannot_be_reused_in_the_same_game(self):
        next_round = Round.objects.create(game=self.game, number=2)

        with self.assertRaises(ValidationError):
            RoundPile.objects.create(game=self.game, round=next_round, card=self.card)

    def test_a_pile_must_belong_to_the_round_game(self):
        other = Game.objects.create()

        with self.assertRaises(ValidationError):
            RoundPile.objects.create(game=other, round=self.round, card=self.card)

    def test_a_participant_receives_one_copy(self):
        DealtHand.objects.create(
            round=self.round,
            participant=self.participant,
            card_copy=self.copies[0],
        )

        with self.assertRaises(ValidationError):
            DealtHand.objects.create(
                round=self.round,
                participant=self.participant,
                card_copy=self.copies[1],
            )

    def test_a_copy_is_dealt_once_per_round(self):
        other = Participant.objects.create(game=self.game, name="Luis")
        DealtHand.objects.create(
            round=self.round,
            participant=self.participant,
            card_copy=self.copies[0],
        )

        with self.assertRaises(ValidationError):
            DealtHand.objects.create(
                round=self.round,
                participant=other,
                card_copy=self.copies[0],
            )

    def test_a_participant_from_another_game_is_rejected(self):
        other = Game.objects.create()
        outsider = Participant.objects.create(game=other, name="Luis")

        with self.assertRaises(ValidationError):
            DealtHand.objects.create(
                round=self.round,
                participant=outsider,
                card_copy=self.copies[0],
            )

    def test_undealt_copies_stay_in_the_discard(self):
        DealtHand.objects.create(
            round=self.round,
            participant=self.participant,
            card_copy=self.copies[0],
        )

        dealt_ids = set(self.round.dealt_copies().values_list("pk", flat=True))
        discard_ids = set(self.round.discard_copies().values_list("pk", flat=True))

        self.assertEqual(dealt_ids, {self.copies[0].pk})
        self.assertEqual(discard_ids, {self.copies[1].pk, self.copies[2].pk})
        self.assertTrue(dealt_ids.isdisjoint(discard_ids))

    def test_a_discarded_copy_cannot_be_dealt(self):
        DiscardedCopy.objects.create(round=self.round, card_copy=self.copies[1])

        with self.assertRaises(ValidationError):
            DealtHand.objects.create(
                round=self.round,
                participant=self.participant,
                card_copy=self.copies[1],
            )

    def test_a_dealt_copy_cannot_be_discarded(self):
        DealtHand.objects.create(
            round=self.round,
            participant=self.participant,
            card_copy=self.copies[0],
        )

        with self.assertRaises(ValidationError):
            DiscardedCopy.objects.create(
                round=self.round,
                card_copy=self.copies[0],
            )
