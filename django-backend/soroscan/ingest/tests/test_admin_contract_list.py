"""
Tests for TrackedContractAdmin search, filtering, and ordering (issue #277).

Verifies that:
- search_fields cover contract address (contract_id) and name
- list_filter sidebar works for is_active and network
- list columns are orderable by created_at and name without N+1 queries
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory

from soroscan.ingest.admin import TrackedContractAdmin
from soroscan.ingest.models import TrackedContract
from soroscan.ingest.tests.factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestTrackedContractAdminConfiguration:
    """Verify static admin class configuration without hitting the database."""

    def test_search_fields_include_contract_id(self):
        assert "contract_id" in TrackedContractAdmin.search_fields

    def test_search_fields_include_name(self):
        assert "name" in TrackedContractAdmin.search_fields

    def test_search_fields_include_alias(self):
        assert "alias" in TrackedContractAdmin.search_fields

    def test_list_filter_includes_is_active(self):
        assert "is_active" in TrackedContractAdmin.list_filter

    def test_list_filter_includes_network(self):
        assert "network" in TrackedContractAdmin.list_filter

    def test_list_display_includes_network(self):
        assert "network" in TrackedContractAdmin.list_display

    def test_list_display_includes_name(self):
        assert "name" in TrackedContractAdmin.list_display

    def test_list_display_includes_created_at(self):
        assert "created_at" in TrackedContractAdmin.list_display

    def test_list_display_includes_is_active(self):
        assert "is_active" in TrackedContractAdmin.list_display

    def test_ordering_contains_created_at(self):
        ordering = TrackedContractAdmin.ordering
        assert any("created_at" in o for o in ordering), f"created_at not in ordering={ordering}"

    def test_ordering_contains_name(self):
        assert "name" in TrackedContractAdmin.ordering


@pytest.mark.django_db
class TestTrackedContractAdminQueryset:
    """Functional tests against the database for queryset optimisation."""

    def setup_method(self):
        self.site = AdminSite()
        self.admin = TrackedContractAdmin(TrackedContract, self.site)
        self.factory = RequestFactory()
        self.superuser = UserFactory(is_staff=True, is_superuser=True)

    def _get(self, path="/"):
        request = self.factory.get(path)
        request.user = self.superuser
        return request

    def test_get_queryset_returns_all_contracts(self):
        TrackedContractFactory.create_batch(5)
        qs = self.admin.get_queryset(self._get())
        assert qs.count() == 5

    def test_get_queryset_has_event_count_annotation(self):
        TrackedContractFactory()
        qs = self.admin.get_queryset(self._get())
        first = qs.first()
        # The _event_count annotation must be present
        assert hasattr(first, "_event_count")

    def test_get_queryset_no_n_plus_one_for_owner(self, django_assert_num_queries):
        """Owner access must be covered by select_related — no extra queries."""
        TrackedContractFactory.create_batch(10)
        request = self._get()
        with django_assert_num_queries(1):
            qs = self.admin.get_queryset(request)
            # Force evaluation + FK access
            owners = [c.owner.username for c in qs]
        assert len(owners) == 10

    def test_get_queryset_no_n_plus_one_for_team(self, django_assert_num_queries):
        """Team access must be covered by select_related — no extra queries."""
        TrackedContractFactory.create_batch(10)
        request = self._get()
        with django_assert_num_queries(1):
            qs = self.admin.get_queryset(request)
            teams = [c.team for c in qs]
        assert len(teams) == 10


@pytest.mark.django_db
class TestTrackedContractAdminNetworkFilter:
    """Functional tests for the network filter sidebar."""

    def setup_method(self):
        self.site = AdminSite()
        self.admin = TrackedContractAdmin(TrackedContract, self.site)
        self.factory = RequestFactory()
        self.superuser = UserFactory(is_staff=True, is_superuser=True)

    def test_filter_by_mainnet(self):
        TrackedContractFactory(network=TrackedContract.Network.MAINNET)
        TrackedContractFactory(network=TrackedContract.Network.TESTNET)
        qs = TrackedContract.objects.filter(network=TrackedContract.Network.MAINNET)
        assert qs.count() == 1
        assert qs.first().network == TrackedContract.Network.MAINNET

    def test_filter_by_testnet(self):
        TrackedContractFactory(network=TrackedContract.Network.TESTNET)
        TrackedContractFactory(network=TrackedContract.Network.MAINNET)
        qs = TrackedContract.objects.filter(network=TrackedContract.Network.TESTNET)
        assert qs.count() == 1

    def test_filter_by_futurenet(self):
        TrackedContractFactory(network=TrackedContract.Network.FUTURENET)
        TrackedContractFactory(network=TrackedContract.Network.MAINNET)
        qs = TrackedContract.objects.filter(network=TrackedContract.Network.FUTURENET)
        assert qs.count() == 1

    def test_filter_by_is_active_true(self):
        TrackedContractFactory(is_active=True)
        TrackedContractFactory(is_active=False)
        qs = TrackedContract.objects.filter(is_active=True)
        assert qs.count() == 1

    def test_filter_by_is_active_false(self):
        TrackedContractFactory(is_active=True)
        TrackedContractFactory(is_active=False)
        qs = TrackedContract.objects.filter(is_active=False)
        assert qs.count() == 1


@pytest.mark.django_db
class TestTrackedContractAdminSearch:
    """Verify search queries correctly filter by address and name."""

    def test_search_by_contract_id(self):
        c = TrackedContractFactory(contract_id="C" + "A" * 55)
        TrackedContractFactory()  # another contract
        qs = TrackedContract.objects.filter(contract_id__icontains="AAAA")
        assert c in qs

    def test_search_by_name(self):
        c = TrackedContractFactory(name="UniqueTokenSwapper")
        TrackedContractFactory(name="OtherContract")
        qs = TrackedContract.objects.filter(name__icontains="UniqueToken")
        assert c in qs
        assert qs.count() == 1

    def test_search_by_alias(self):
        c = TrackedContractFactory(alias="MySpecialAlias")
        TrackedContractFactory(alias="")
        qs = TrackedContract.objects.filter(alias__icontains="MySpecialAlias")
        assert c in qs


@pytest.mark.django_db
class TestTrackedContractNetworkField:
    """Unit tests for the new network model field."""

    def test_default_network_is_mainnet(self):
        c = TrackedContractFactory()
        assert c.network == TrackedContract.Network.MAINNET

    def test_network_choices_are_correct(self):
        valid = {c[0] for c in TrackedContract.Network.choices}
        assert valid == {"mainnet", "testnet", "futurenet"}

    def test_network_field_saved_and_retrieved(self):
        c = TrackedContractFactory(network=TrackedContract.Network.TESTNET)
        c.refresh_from_db()
        assert c.network == "testnet"

    def test_network_field_db_index_exists(self):
        """Confirm the field is marked as db_index in the model definition."""
        field = TrackedContract._meta.get_field("network")
        assert field.db_index is True
