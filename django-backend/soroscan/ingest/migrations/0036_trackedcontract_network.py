"""
Migration: add `network` field to TrackedContract (issue #277).

Adds a CharField with choices (mainnet / testnet / futurenet) and a
composite index on (network, is_active) for performant admin filtering.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0035_auditlog_piifield_datadeletionrequest_contractdeployment_contractabiversion"),
    ]

    operations = [
        migrations.AddField(
            model_name="trackedcontract",
            name="network",
            field=models.CharField(
                choices=[
                    ("mainnet", "Mainnet"),
                    ("testnet", "Testnet"),
                    ("futurenet", "Futurenet"),
                ],
                default="mainnet",
                db_index=True,
                help_text="Stellar network this contract is deployed on (mainnet, testnet, futurenet)",
                max_length=16,
            ),
        ),
        migrations.AddIndex(
            model_name="trackedcontract",
            index=models.Index(fields=["network", "is_active"], name="ingest_trac_network_is_active_idx"),
        ),
    ]
