# Generated migration for ContractMetadata model
# Requirement 1.7: creates ingest_contractmetadata without altering any existing table

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0028_callgraph_contractdependency_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContractMetadata",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "contract",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contractmetadata",
                        to="ingest.trackedcontract",
                    ),
                ),
                ("name", models.CharField(max_length=256)),
                ("description", models.TextField(blank=True)),
                ("tags", models.JSONField(default=list, blank=True)),
                ("documentation_url", models.URLField(blank=True)),
                ("github_repo", models.URLField(blank=True)),
                ("team_email", models.EmailField(blank=True, max_length=254)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Contract Metadata",
                "verbose_name_plural": "Contract Metadata",
            },
        ),
    ]
