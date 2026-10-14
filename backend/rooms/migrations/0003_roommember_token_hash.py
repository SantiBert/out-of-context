import hashlib
import secrets

from django.db import migrations, models


def fill_token_hashes(apps, schema_editor):
    member_model = apps.get_model("rooms", "RoomMember")
    for member in member_model.objects.all():
        if member.token_hash:
            continue
        token = secrets.token_urlsafe(32)
        member.token_hash = hashlib.sha256(token.encode()).hexdigest()
        member.save(update_fields=["token_hash"])


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0002_room_game_alter_room_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="roommember",
            name="token_hash",
            field=models.CharField(max_length=64, null=True),
        ),
        migrations.RunPython(fill_token_hashes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="roommember",
            name="token_hash",
            field=models.CharField(max_length=64, unique=True),
        ),
    ]
