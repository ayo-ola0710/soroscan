"""Add ContractABI model and decoded_payload / decoding_status to ContractEvent.

Issue #58 — Contract ABI registry for decoding raw Soroban event payloads.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0006_add_contract_timestamp_index"),
    ]

    operations = [
        # -- ContractABI model --
        migrations.CreateModel(
            name="ContractABI",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "abi_json",
                    models.JSONField(
                        help_text='JSON array of event definitions: [{"name": "...", "fields": [{"name": "...", "type": "..."}]}]',
                    ),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "contract",
                    models.OneToOneField(
                        help_text="Contract this ABI applies to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="abi",
                        to="ingest.trackedcontract",
                    ),
                ),
            ],
            options={
                "verbose_name": "Contract ABI",
                "verbose_name_plural": "Contract ABIs",
            },
        ),
        # -- New fields on ContractEvent --
        migrations.AddField(
            model_name="contractevent",
            name="decoded_payload",
            field=models.JSONField(
                blank=True,
                help_text="ABI-decoded event payload (human-readable fields)",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="contractevent",
            name="decoding_status",
            field=models.CharField(
                choices=[
                    ("success", "Success"),
                    ("failed", "Failed"),
                    ("no_abi", "No ABI"),
                ],
                db_index=True,
                default="no_abi",
                help_text="Result of ABI-based XDR decoding",
                max_length=16,
            ),
        ),
    ]
