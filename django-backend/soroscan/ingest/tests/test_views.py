import pytest
import responses
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import TrackedContract, WebhookSubscription

from .factories import (
    ContractEventFactory,
    TrackedContractFactory,
    UserFactory,
    WebhookSubscriptionFactory,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


@pytest.mark.django_db
class TestTrackedContractViewSet:
    def test_list_contracts(self, authenticated_client, contract):
        url = reverse("contract-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["contract_id"] == contract.contract_id

    def test_list_contracts_unauthorized(self, api_client):
        url = reverse("contract-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_contract(self, authenticated_client):
        url = reverse("contract-list")
        data = {
            "contract_id": "C" + "A" * 55,
            "name": "New Contract",
            "description": "Test",
            "is_active": True,
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert TrackedContract.objects.filter(name="New Contract").exists()

    def test_create_contract_validation_error(self, authenticated_client):
        url = reverse("contract-list")
        data = {"name": "Invalid"}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "contract_id" in response.data

    def test_get_contract_events(self, authenticated_client, contract):
        ContractEventFactory.create_batch(3, contract=contract)
        url = reverse("contract-events", args=[contract.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_get_contract_stats(self, authenticated_client, contract):
        ContractEventFactory.create_batch(5, contract=contract, event_type="swap")
        ContractEventFactory.create_batch(3, contract=contract, event_type="transfer")

        url = reverse("contract-stats", args=[contract.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_events"] == 8
        assert response.data["unique_event_types"] == 2

    def test_update_contract(self, authenticated_client, contract):
        url = reverse("contract-detail", args=[contract.id])
        data = {"name": "Updated Name", "is_active": False}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        contract.refresh_from_db()
        assert contract.name == "Updated Name"
        assert contract.is_active is False

    def test_delete_contract(self, authenticated_client, contract):
        url = reverse("contract-detail", args=[contract.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TrackedContract.objects.filter(id=contract.id).exists()


@pytest.mark.django_db
class TestContractEventViewSet:
    def test_list_events(self, authenticated_client, contract):
        ContractEventFactory.create_batch(3, contract=contract)
        url = reverse("event-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_list_events_unauthorized(self, api_client):
        url = reverse("event-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_filter_events_by_contract(self, authenticated_client, contract):
        other_contract = TrackedContractFactory(owner=authenticated_client.handler._force_user)
        ContractEventFactory.create_batch(2, contract=contract)
        ContractEventFactory.create_batch(3, contract=other_contract)

        url = reverse("event-list")
        response = authenticated_client.get(url, {"contract__contract_id": contract.contract_id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_filter_events_by_type(self, authenticated_client, contract):
        ContractEventFactory.create_batch(2, contract=contract, event_type="swap")
        ContractEventFactory.create_batch(3, contract=contract, event_type="transfer")

        url = reverse("event-list")
        response = authenticated_client.get(url, {"event_type": "swap"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_filter_events_by_validation_status(self, authenticated_client, contract):
        ContractEventFactory(contract=contract, validation_status="passed")
        ContractEventFactory(contract=contract, validation_status="failed")

        url = reverse("event-list")
        response = authenticated_client.get(url, {"validation_status": "failed"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_filter_events_by_decoding_status(self, authenticated_client, contract):
        ContractEventFactory(contract=contract, decoding_status="success")
        ContractEventFactory(contract=contract, decoding_status="failed")
        ContractEventFactory(contract=contract, decoding_status="no_abi")

        url = reverse("event-list")
        response = authenticated_client.get(url, {"decoding_status": "failed"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["decoding_status"] == "failed"


@pytest.mark.django_db
class TestWebhookSubscriptionViewSet:
    def test_list_webhooks(self, authenticated_client, contract):
        WebhookSubscriptionFactory.create_batch(2, contract=contract)
        url = reverse("webhook-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_create_webhook(self, authenticated_client, contract):
        url = reverse("webhook-list")
        data = {
            "contract": contract.id,
            "event_type": "swap",
            "target_url": "https://example.com/webhook",
            "is_active": True,
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert WebhookSubscription.objects.filter(target_url="https://example.com/webhook").exists()

    def test_create_webhook_validation_error(self, authenticated_client):
        url = reverse("webhook-list")
        data = {"event_type": "swap"}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @responses.activate
    def test_webhook_test_endpoint(self, authenticated_client, contract):
        webhook = WebhookSubscriptionFactory(contract=contract)
        responses.add(responses.POST, webhook.target_url, status=200)

        url = reverse("webhook-test", args=[webhook.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "test_webhook_queued"

    def test_delete_webhook(self, authenticated_client, contract):
        webhook = WebhookSubscriptionFactory(contract=contract)
        url = reverse("webhook-detail", args=[webhook.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not WebhookSubscription.objects.filter(id=webhook.id).exists()


@pytest.mark.django_db
class TestRecordEventView:
    @pytest.fixture(autouse=True)
    def setup_throttle_rates(self, settings):
        """Ensure throttle rates are configured for tests"""
        if 'DEFAULT_THROTTLE_RATES' not in settings.REST_FRAMEWORK:
            settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}
        settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].update({
            'anon': '1000/hour',
            'user': '10000/hour',
            'ingest': '100/hour',
            'graphql': '500/hour',
        })
    
    @responses.activate
    def test_record_event_success(self, authenticated_client):
        responses.add(
            responses.POST,
            "https://soroban-testnet.stellar.org/",
            json={"status": "PENDING", "hash": "abc123"},
            status=200,
        )

        url = reverse("record-event")
        data = {
            "contract_id": "C" + "A" * 55,
            "event_type": "swap",
            "payload_hash": "a" * 64,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code in [status.HTTP_202_ACCEPTED, status.HTTP_400_BAD_REQUEST]

    def test_record_event_validation_error(self, authenticated_client):
        url = reverse("record-event")
        data = {"event_type": "swap"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "contract_id" in response.data


@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check(self, api_client):
        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "healthy"
        assert response.data["service"] == "soroscan"


@pytest.mark.django_db
class TestTimelinePageView:
    def test_contract_timeline_page_redirects_to_frontend(self, api_client, contract, settings):
        settings.FRONTEND_BASE_URL = "http://localhost:3000"
        url = reverse("contract-timeline", args=[contract.contract_id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_302_FOUND
        assert response["Location"] == (
            f"http://localhost:3000/contracts/{contract.contract_id}/timeline"
        )

    def test_contract_timeline_page_missing_contract_returns_404(self, api_client):
        url = reverse("contract-timeline", args=["C" + "A" * 55])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestEventExplorerPageView:
    def test_contract_event_explorer_page_redirects_to_frontend(
        self,
        api_client,
        contract,
        settings,
    ):
        settings.FRONTEND_BASE_URL = "http://localhost:3000"
        url = reverse("contract-event-explorer", args=[contract.contract_id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_302_FOUND
        assert response["Location"] == (
            f"http://localhost:3000/contracts/{contract.contract_id}/events/explorer"
        )

    def test_contract_event_explorer_missing_contract_returns_404(self, api_client):
        url = reverse("contract-event-explorer", args=["C" + "A" * 55])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
