import random

from django.test import TestCase

from games.deck import (
    InsufficientPiles,
    InvalidPileSet,
    InvalidPlayerCount,
    create_piles,
    deck_config,
    start_round,
)
from games.models import CardCopy, Game, Participant, Round, SituationCard


def make_players(game, count):
    for index in range(count):
        Participant.objects.create(game=game, name=f"Jugador {index}")


def make_cards(count, start=1):
    cards = []
    for number in range(start, start + count):
        card = SituationCard.objects.create(
            number=number,
            text=f"Situación {number}.",
        )
        for copy_number in (1, 2, 3):
            CardCopy.objects.create(card=card, copy_number=copy_number)
        cards.append(card)
    return cards


def prepared_game(player_count):
    config = deck_config(player_count)
    game = Game.objects.create()
    make_players(game, player_count)
    create_piles(game, make_cards(config.pile_count))
    return game


class DeckConfigTests(TestCase):
    def test_four_to_six_players_use_fifteen_piles(self):
        for player_count in (4, 5, 6):
            config = deck_config(player_count)
            self.assertEqual(config.pile_count, 15)
            self.assertEqual(config.copies_per_pile, 3)
            self.assertEqual(config.piles_per_round, 3)
            self.assertEqual(config.max_rounds, 5)

    def test_seven_and_eight_players_use_sixteen_piles(self):
        for player_count in (7, 8):
            config = deck_config(player_count)
            self.assertEqual(config.pile_count, 16)
            self.assertEqual(config.copies_per_pile, 3)
            self.assertEqual(config.piles_per_round, 4)
            self.assertEqual(config.max_rounds, 4)

    def test_invalid_player_counts_are_rejected(self):
        for player_count in (0, 3, 9, True, False):
            with self.assertRaises(InvalidPlayerCount):
                deck_config(player_count)


class CreatePilesTests(TestCase):
    def test_a_four_player_game_stores_fifteen_piles(self):
        game = prepared_game(4)

        self.assertEqual(game.piles.count(), 15)

    def test_a_seven_player_game_stores_sixteen_piles(self):
        game = prepared_game(7)

        self.assertEqual(game.piles.count(), 16)

    def test_the_wrong_pile_count_is_rejected(self):
        game = Game.objects.create()
        make_players(game, 4)

        with self.assertRaises(InvalidPileSet):
            create_piles(game, make_cards(14))

        self.assertEqual(game.piles.count(), 0)

    def test_a_pile_must_have_three_copies(self):
        game = Game.objects.create()
        make_players(game, 4)
        cards = make_cards(15)
        cards[0].copies.filter(copy_number=3).delete()

        with self.assertRaises(InvalidPileSet):
            create_piles(game, cards)

    def test_a_second_pile_set_is_not_stored(self):
        game = prepared_game(4)
        cards = [pile.card for pile in game.piles.select_related("card")]

        with self.assertRaises(InvalidPileSet):
            create_piles(game, cards)

        self.assertEqual(game.piles.count(), 15)


class StartRoundTests(TestCase):
    def test_four_players_select_three_piles(self):
        game = prepared_game(4)

        round_ = start_round(game, random.Random(1))

        self.assertEqual(round_.status, Round.Status.PREPARED)
        self.assertEqual(round_.piles.count(), 3)
        self.assertEqual(round_.dealt_hands.count(), 0)

    def test_seven_players_select_four_piles(self):
        game = prepared_game(7)

        round_ = start_round(game, random.Random(1))

        self.assertEqual(round_.piles.count(), 4)

    def test_the_same_seed_selects_the_same_piles(self):
        cards = make_cards(15)
        games = []
        for _index in range(2):
            game = Game.objects.create()
            make_players(game, 4)
            create_piles(game, cards)
            games.append(game)

        first = start_round(games[0], random.Random(7))
        second = start_round(games[1], random.Random(7))
        first_numbers = list(
            first.piles.order_by("card__number").values_list(
                "card__number",
                flat=True,
            )
        )
        second_numbers = list(
            second.piles.order_by("card__number").values_list(
                "card__number",
                flat=True,
            )
        )

        self.assertEqual(first_numbers, second_numbers)

    def test_consumed_piles_are_not_selected_again(self):
        game = prepared_game(4)
        rng = random.Random(3)
        first = start_round(game, rng)
        second = start_round(game, rng)
        first_ids = set(first.piles.values_list("card_id", flat=True))
        second_ids = set(second.piles.values_list("card_id", flat=True))

        self.assertTrue(first_ids.isdisjoint(second_ids))

    def test_a_round_past_the_maximum_is_not_stored(self):
        game = prepared_game(4)
        rng = random.Random(5)
        for _index in range(5):
            start_round(game, rng)

        with self.assertRaises(InsufficientPiles):
            start_round(game, rng)

        self.assertEqual(game.rounds.count(), 5)

    def test_eight_players_stop_after_four_rounds(self):
        game = prepared_game(8)
        rng = random.Random(5)
        for _index in range(4):
            start_round(game, rng)

        with self.assertRaises(InsufficientPiles):
            start_round(game, rng)

        self.assertEqual(game.rounds.count(), 4)
