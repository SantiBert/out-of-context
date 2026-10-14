import random
import threading

from django.db import connections
from django.test import TestCase, TransactionTestCase

from games.deck import (
    GameFinished,
    InsufficientPiles,
    RoundStillOpen,
    deal_round,
    deck_config,
    round_public_view,
    start_round,
)
from games.models import Game, GamePile, Round
from games.test.test_deck import finish_round, prepared_game


class PrepareRoundTests(TestCase):
    def test_each_player_count_uses_only_free_piles(self):
        card_start = 1
        for player_count in (4, 5, 6, 7, 8):
            with self.subTest(player_count=player_count):
                config = deck_config(player_count)
                game = prepared_game(player_count, start=card_start)
                card_start += config.pile_count

                round_ = start_round(game, random.Random(player_count))

                game.refresh_from_db()
                piles = list(round_.piles.select_related("card"))
                self.assertEqual(round_.status, Round.Status.PREPARED)
                self.assertEqual(len(piles), config.piles_per_round)
                self.assertEqual(len({pile.card_id for pile in piles}), len(piles))
                self.assertEqual(game.status, Game.Status.PREPARING)
                view = round_public_view(round_)
                self.assertNotIn("card", view)
                rendered = str(view)
                for pile in piles:
                    self.assertNotIn(pile.card.text, rendered)

    def test_the_prepared_round_can_be_dealt(self):
        game = prepared_game(4)
        participants = list(game.participants.order_by("pk"))
        round_ = start_round(game, random.Random(1))

        dealt = deal_round(round_, participants, random.Random(1))

        self.assertEqual(dealt.pk, round_.pk)
        self.assertEqual(dealt.status, Round.Status.CONVERSATION)
        self.assertEqual(dealt.dealt_hands.count(), 4)

    def test_a_second_request_does_not_consume_more_piles(self):
        game = prepared_game(4)
        start_round(game, random.Random(1))

        with self.assertRaises(RoundStillOpen):
            start_round(game, random.Random(2))

        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(game.consumed_piles.count(), 3)
        self.assertEqual(game.status, Game.Status.PREPARING)

    def test_exhausted_piles_do_not_open_another_round(self):
        game = prepared_game(4)
        first = start_round(game, random.Random(1))
        finish_round(first)
        used = set(first.piles.values_list("card_id", flat=True))
        GamePile.objects.filter(game=game).exclude(card_id__in=used).delete()

        with self.assertRaises(InsufficientPiles):
            start_round(game, random.Random(2))

        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(game.consumed_piles.count(), 3)

    def test_the_round_limit_does_not_open_another_round(self):
        card_start = 1
        for player_count, limit in ((4, 5), (8, 4)):
            with self.subTest(player_count=player_count):
                config = deck_config(player_count)
                game = prepared_game(player_count, start=card_start)
                card_start += config.pile_count
                for _index in range(limit):
                    finish_round(start_round(game, random.Random(player_count)))

                with self.assertRaises(InsufficientPiles):
                    start_round(game, random.Random(9))

                self.assertEqual(game.rounds.count(), limit)
                self.assertEqual(
                    game.consumed_piles.count(),
                    limit * config.piles_per_round,
                )

    def test_a_finished_game_does_not_prepare_a_round(self):
        game = prepared_game(4)
        game.status = Game.Status.FINISHED
        game.save()

        with self.assertRaises(GameFinished):
            start_round(game, random.Random(1))

        self.assertEqual(game.rounds.count(), 0)
        self.assertEqual(game.consumed_piles.count(), 0)


class ConcurrentPrepareTests(TransactionTestCase):
    def test_two_prepares_create_one_round(self):
        game = prepared_game(4)
        barrier = threading.Barrier(2)
        errors = []

        def attempt():
            try:
                barrier.wait()
                start_round(game, random.Random(1))
            except RoundStillOpen as error:
                errors.append(error)
            finally:
                connections.close_all()

        connections.close_all()
        threads = [threading.Thread(target=attempt) for _index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(game.rounds.count(), 1)
        self.assertEqual(game.consumed_piles.count(), 3)
        self.assertEqual(len(errors), 1)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.PREPARING)
