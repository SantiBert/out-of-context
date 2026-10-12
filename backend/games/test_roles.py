import random

from django.test import SimpleTestCase, TestCase

from games.deck import prepare_round, round_public_view, start_round
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
from games.roles import InvalidClassification, classify_hands, classify_round
from games.test_deck import prepared_game


class ClassifyHandsTests(SimpleTestCase):
    def test_two_players_with_the_same_card_form_a_team(self):
        result = classify_hands([("Ana", 1), ("Luis", 1)])

        self.assertEqual(len(result.teams), 1)
        self.assertEqual(result.teams[0].players, ("Ana", "Luis"))
        self.assertEqual(result.impostors, ())

    def test_three_players_with_the_same_card_form_a_team(self):
        result = classify_hands([("Ana", 1), ("Luis", 1), ("Nora", 1)])

        self.assertEqual(result.teams[0].players, ("Ana", "Luis", "Nora"))
        self.assertEqual(result.impostors, ())

    def test_four_players_can_form_two_teams(self):
        result = classify_hands([("Ana", 1), ("Luis", 1), ("Nora", 2), ("Otto", 2)])

        self.assertEqual(result.impostors, ())
        self.assertEqual(
            [team.players for team in result.teams],
            [("Ana", "Luis"), ("Nora", "Otto")],
        )

    def test_a_team_of_three_leaves_one_impostor(self):
        result = classify_hands([("Ana", 1), ("Luis", 1), ("Nora", 1), ("Otto", 2)])

        self.assertEqual(result.teams[0].players, ("Ana", "Luis", "Nora"))
        self.assertEqual(result.impostors[0].player, "Otto")
        self.assertEqual(result.impostors[0].situation, 2)

    def test_a_single_dealt_copy_is_an_impostor(self):
        result = classify_hands([("Ana", 1), ("Luis", 1), ("Nora", 2)])

        self.assertEqual(result.teams[0].players, ("Ana", "Luis"))
        self.assertEqual(result.impostors[0].player, "Nora")
        self.assertEqual(result.impostors[0].situation, 2)

    def test_impostors_with_different_cards_are_not_a_team(self):
        result = classify_hands([("Ana", 1), ("Luis", 2), ("Nora", 3)])

        self.assertEqual(result.teams, ())
        self.assertEqual(
            [impostor.player for impostor in result.impostors],
            ["Ana", "Luis", "Nora"],
        )
        self.assertEqual(len({item.situation for item in result.impostors}), 3)

    def test_teams_and_impostors_can_share_a_round(self):
        result = classify_hands(
            [
                ("Ana", 1),
                ("Luis", 1),
                ("Nora", 1),
                ("Otto", 2),
                ("Paz", 3),
            ]
        )

        self.assertEqual(result.teams[0].players, ("Ana", "Luis", "Nora"))
        self.assertEqual(
            [(item.situation, item.player) for item in result.impostors],
            [(2, "Otto"), (3, "Paz")],
        )

    def test_an_undealt_copy_is_not_part_of_the_classification(self):
        dealt = [("Ana", 1), ("Luis", 1), ("Nora", 2)]
        including_an_undealt_copy = [*dealt, ("Extra", 2)]

        dealt_result = classify_hands(dealt)
        self.assertEqual(dealt_result.impostors[0].player, "Nora")
        self.assertEqual(len(classify_hands(including_an_undealt_copy).teams), 2)

    def test_the_same_input_has_the_same_classification(self):
        first = [("Nora", 2), ("Ana", 1), ("Luis", 1)]
        second = [("Luis", 1), ("Nora", 2), ("Ana", 1)]

        self.assertEqual(classify_hands(first), classify_hands(second))

    def test_a_player_cannot_be_classified_twice(self):
        with self.assertRaises(InvalidClassification):
            classify_hands([("Ana", 1), ("Ana", 2)])

    def test_four_copies_of_one_situation_are_rejected(self):
        with self.assertRaises(InvalidClassification):
            classify_hands([("Ana", 1), ("Luis", 1), ("Nora", 1), ("Otto", 1)])


class ClassifyRoundTests(TestCase):
    def test_a_discarded_copy_does_not_change_the_impostor(self):
        game = Game.objects.create()
        players = [
            Participant.objects.create(game=game, name=name)
            for name in ("Ana", "Luis", "Nora")
        ]
        shared = SituationCard.objects.create(number=1, text="Compartida.")
        unique = SituationCard.objects.create(number=2, text="Única.")
        shared_copies = [
            CardCopy.objects.create(card=shared, copy_number=index)
            for index in (1, 2, 3)
        ]
        unique_copies = [
            CardCopy.objects.create(card=unique, copy_number=index)
            for index in (1, 2, 3)
        ]
        round_ = Round.objects.create(
            game=game,
            number=1,
            status=Round.Status.CONVERSATION,
        )
        RoundPile.objects.create(game=game, round=round_, card=shared)
        RoundPile.objects.create(game=game, round=round_, card=unique)
        DealtHand.objects.create(
            round=round_,
            participant=players[0],
            card_copy=shared_copies[0],
        )
        DealtHand.objects.create(
            round=round_,
            participant=players[1],
            card_copy=shared_copies[1],
        )
        DealtHand.objects.create(
            round=round_,
            participant=players[2],
            card_copy=unique_copies[0],
        )
        DiscardedCopy.objects.create(round=round_, card_copy=unique_copies[1])

        result = classify_round(round_)

        self.assertEqual(result.teams[0].players, (players[0].pk, players[1].pk))
        self.assertEqual(result.impostors[0].player, players[2].pk)
        self.assertEqual(result.impostors[0].situation, unique.pk)

    def test_a_round_that_was_not_dealt_is_rejected(self):
        game = prepared_game(4)
        round_ = start_round(game, random.Random(1))

        with self.assertRaises(InvalidClassification):
            classify_round(round_)

    def test_the_public_view_does_not_include_roles(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = prepare_round(game, participants, random.Random(1))
        view = round_public_view(round_)

        self.assertFalse({"teams", "impostors", "role", "card"} & set(view))
        classified = classify_round(round_)
        self.assertTrue(classified.teams or classified.impostors)
