import json
from pathlib import Path

from django.db import transaction

from games.models import COPIES_PER_CARD, CardCopy, SituationCard


class InvalidCatalog(Exception):
    pass


def catalog_path():
    return Path(__file__).resolve().parents[1] / "cards.json"


def load_situation_cards(path=None):
    entries = read_catalog(path)
    with transaction.atomic():
        for number, text in entries:
            card, _created = SituationCard.objects.update_or_create(
                number=number,
                defaults={"text": text},
            )
            for copy_number in range(1, COPIES_PER_CARD + 1):
                CardCopy.objects.get_or_create(
                    card=card,
                    copy_number=copy_number,
                )
    return len(entries)


def read_catalog(path=None):
    source = Path(path) if path is not None else catalog_path()
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise InvalidCatalog("El catálogo no se puede leer.") from exc
    if not isinstance(raw, dict) or not isinstance(raw.get("cards"), list):
        raise InvalidCatalog("El catálogo no tiene una lista de cartas.")
    seen = set()
    entries = []
    for item in raw["cards"]:
        if not isinstance(item, dict):
            raise InvalidCatalog("Una carta del catálogo no es válida.")
        number = item.get("number")
        text = item.get("description")
        if isinstance(number, bool) or not isinstance(number, int) or number < 1:
            raise InvalidCatalog("Una carta del catálogo no tiene un número válido.")
        if not isinstance(text, str) or text.strip() == "":
            raise InvalidCatalog("Una carta del catálogo no tiene texto.")
        if number in seen:
            raise InvalidCatalog("El catálogo repite un número de carta.")
        seen.add(number)
        entries.append((number, text))
    if not entries:
        raise InvalidCatalog("El catálogo no tiene cartas.")
    return entries
