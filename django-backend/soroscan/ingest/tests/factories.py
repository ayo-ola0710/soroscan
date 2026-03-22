import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from soroscan.ingest.models import (
    ContractABI,
    ContractEvent,
    EventSchema,
    TrackedContract,
    WebhookDeliveryLog,
    WebhookSubscription,
)

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")


class TrackedContractFactory(DjangoModelFactory):
    class Meta:
        model = TrackedContract

    contract_id = factory.Sequence(lambda n: f"C{str(n).zfill(55)}{'A' * (55 - len(str(n)))}")
    name = factory.Sequence(lambda n: f"Contract {n}")
    description = "Test contract"
    owner = factory.SubFactory(UserFactory)
    is_active = True


class EventSchemaFactory(DjangoModelFactory):
    class Meta:
        model = EventSchema

    contract = factory.SubFactory(TrackedContractFactory)
    version = 1
    event_type = "test_event"
    json_schema = {
        "type": "object",
        "properties": {"amount": {"type": "number"}},
        "required": ["amount"],
    }


class ContractEventFactory(DjangoModelFactory):
    class Meta:
        model = ContractEvent

    contract = factory.SubFactory(TrackedContractFactory)
    event_type = "swap"
    payload = {"amount": 100, "from": "Alice", "to": "Bob"}
    payload_hash = factory.Sequence(lambda n: f"{'a' * 64}")
    ledger = factory.Sequence(lambda n: 1000 + n)
    event_index = factory.Sequence(lambda n: n)
    timestamp = factory.Faker("date_time")
    tx_hash = factory.Sequence(lambda n: f"{'b' * 64}")


class WebhookSubscriptionFactory(DjangoModelFactory):
    class Meta:
        model = WebhookSubscription

    contract = factory.SubFactory(TrackedContractFactory)
    event_type = "swap"
    target_url = "https://example.com/webhook"
    secret = factory.Sequence(lambda n: f"secret_{n}")
    is_active = True
    status = WebhookSubscription.STATUS_ACTIVE


class WebhookDeliveryLogFactory(DjangoModelFactory):
    class Meta:
        model = WebhookDeliveryLog

    subscription = factory.SubFactory(WebhookSubscriptionFactory)
    event = factory.SubFactory(ContractEventFactory)
    attempt_number = 1
    status_code = 200
    success = True
    error = ""


class ContractABIFactory(DjangoModelFactory):
    class Meta:
        model = ContractABI

    contract = factory.SubFactory(TrackedContractFactory)
    abi_json = [
        {
            "name": "transfer",
            "fields": [
                {"name": "from", "type": "Address"},
                {"name": "to", "type": "Address"},
                {"name": "amount", "type": "I128"},
            ],
        }
    ]
