import json
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.test import TestCase

from games.catalog import InvalidCatalog, catalog_path, load_situation_cards
from games.models import CardCopy, SituationCard


class LoadSituationCardsTests(TestCase):
    def test_loads_the_file_and_a_second_run_does_not_duplicate(self):
        raw = json.loads(catalog_path().read_text(encoding="utf-8"))
        first = raw["cards"][0]
        draft = SituationCard.objects.create(number=first["number"], text="Borrador.")
        draft.copies.create(copy_number=1)
        SituationCard.objects.create(number=99, text="Ajena.")

        self.assertEqual(load_situation_cards(), 36)

        card = SituationCard.objects.get(number=first["number"])
        self.assertEqual(card.text, first["description"])
        self.assertEqual(
            list(
                card.copies.order_by("copy_number").values_list(
                    "copy_number",
                    flat=True,
                )
            ),
            [1, 2, 3],
        )
        self.assertEqual(SituationCard.objects.count(), 37)
        self.assertTrue(SituationCard.objects.filter(number=99, text="Ajena.").exists())

        card.text = "Otro texto."
        card.save()
        self.assertEqual(load_situation_cards(), 36)
        card.refresh_from_db()
        self.assertEqual(card.text, first["description"])
        self.assertEqual(SituationCard.objects.count(), 37)
        self.assertEqual(CardCopy.objects.filter(card__number=99).count(), 0)
        self.assertEqual(
            CardCopy.objects.exclude(card__number=99).count(),
            36 * 3,
        )

    def test_command_prints_the_count(self):
        output = StringIO()

        call_command("load_cards", stdout=output)

        self.assertIn("Situaciones: 36", output.getvalue())
        self.assertEqual(SituationCard.objects.count(), 36)

    def test_rejects_a_card_without_text(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "cards.json"
            path.write_text(
                json.dumps({"cards": [{"number": 1, "description": "  "}]}),
                encoding="utf-8",
            )

            with self.assertRaises(InvalidCatalog):
                load_situation_cards(path)

        self.assertEqual(SituationCard.objects.count(), 0)
