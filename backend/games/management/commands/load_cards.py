from django.core.management.base import BaseCommand, CommandError

from games.catalog import InvalidCatalog, load_situation_cards


class Command(BaseCommand):
    help = "Carga las situaciones de cards.json y sus tres copias."

    def handle(self, *args, **options):
        try:
            count = load_situation_cards()
        except InvalidCatalog as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(f"Situaciones: {count}")
