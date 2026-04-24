import pytest
from datetime import UTC, datetime
from unittest.mock import Mock
from django.utils import timezone

from soroscan.ingest.schema import schema
from .factories import ContractEventFactory, TrackedContractFactory, UserFactory


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


def create_context_with_user(user):
    """Create a mock context with an authenticated user for GraphQL tests."""
    context = Mock()
    request = Mock()
    request.user = user
    context.request = request
    return context


@pytest.mark.django_db
class TestGraphQLQueries:
    def test_query_contracts(self, contract):
        query = """
            query {
                contracts {
                    id
                    contractId
                    name
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["contracts"]) == 1
        assert result.data["contracts"][0]["contractId"] == contract.contract_id

    def test_query_contracts_filter_active(self, contract):
        TrackedContractFactory(owner=contract.owner, is_active=False)
        
        query = """
            query {
                contracts(isActive: true) {
                    id
                    isActive
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["contracts"]) == 1
        assert result.data["contracts"][0]["isActive"] is True

    def test_schema_has_subscription_type(self):
        """Test that the schema includes subscription type."""
        # Verify the schema has a subscription type
        assert schema.subscription is not None
        
        # Verify subscription operations can be introspected
        introspection_query = """
            query {
                __schema {
                    subscriptionType {
                        name
                        fields {
                            name
                        }
                    }
                }
            }
        """
        result = schema.execute_sync(introspection_query)
        assert result.errors is None
        assert result.data["__schema"]["subscriptionType"] is not None
        assert result.data["__schema"]["subscriptionType"]["name"] == "Subscription"

    def test_query_contract_by_id(self, contract):
        query = f"""
            query {{
                contract(contractId: "{contract.contract_id}") {{
                    id
                    contractId
                    name
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert result.data["contract"]["contractId"] == contract.contract_id

    def test_contract_query_returns_warning_for_deprecated_contract(self, contract):
        contract.deprecation_status = "deprecated"
        contract.deprecation_reason = "This contract is deprecated."
        contract.save(update_fields=["deprecation_status", "deprecation_reason"])

        query = f"""
            query {{
                contract(contractId: "{contract.contract_id}") {{
                    contractId
                    warnings {{
                        type
                        message
                    }}
                }}
            }}
        """
        result = schema.execute_sync(query)

        assert result.errors is None
        assert result.data["contract"]["warnings"] == [
            {
                "type": "deprecation",
                "message": "This contract is deprecated.",
            }
        ]

    def test_contract_query_returns_empty_warnings_for_active_contract(self, contract):
        query = f"""
            query {{
                contract(contractId: "{contract.contract_id}") {{
                    contractId
                    warnings {{
                        type
                        message
                    }}
                }}
            }}
        """
        result = schema.execute_sync(query)

        assert result.errors is None
        assert result.data["contract"]["warnings"] == []

    def test_query_contract_not_found(self):
        query = """
            query {
                contract(contractId: "NONEXISTENT") {
                    id
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert result.data["contract"] is None

    def test_query_events(self, contract):
        ContractEventFactory(contract=contract)
        ContractEventFactory(contract=contract)
        
        query = """
            query {
                events(first: 10) {
                    edges { node { id eventType } cursor }
                    pageInfo { hasNextPage endCursor }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 2
        assert result.data["events"]["totalCount"] == 2

    def test_query_events_filter_by_contract(self, contract):
        other_contract = TrackedContractFactory(owner=contract.owner)
        ContractEventFactory(contract=contract)
        ContractEventFactory(contract=other_contract)
        
        query = f"""
            query {{
                events(contractId: "{contract.contract_id}") {{
                    edges {{ node {{ id contractId }} }}
                    totalCount
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1
        assert result.data["events"]["edges"][0]["node"]["contractId"] == contract.contract_id

    def test_query_events_filter_by_type(self, contract):
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="mint")
        
        query = """
            query {
                events(eventType: "transfer") {
                    edges { node { id eventType } }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1
        assert result.data["events"]["edges"][0]["node"]["eventType"] == "transfer"

    def test_query_events_pagination(self, contract):
        for _ in range(5):
            ContractEventFactory(contract=contract)
        
        query = """
            query {
                events(first: 2) {
                    edges { node { id } cursor }
                    pageInfo { hasNextPage endCursor }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 2
        assert result.data["events"]["pageInfo"]["hasNextPage"] is True
        assert result.data["events"]["totalCount"] == 5

    def test_query_events_max_page_size(self, contract):
        for _ in range(10):
            ContractEventFactory(contract=contract)
        
        query = """
            query {
                events(first: 5000) {
                    edges { node { id } }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 10
        assert result.data["events"]["totalCount"] == 10

    def test_query_events_time_range(self, contract):
        ContractEventFactory(
            contract=contract,
            timestamp=timezone.now() - timezone.timedelta(days=2)
        )
        ContractEventFactory(
            contract=contract,
            timestamp=timezone.now()
        )
        
        since = (timezone.now() - timezone.timedelta(days=1)).isoformat()
        query = f"""
            query {{
                events(since: "{since}") {{
                    edges {{ node {{ id }} }}
                    totalCount
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1

    def test_query_event_by_id(self, contract):
        event = ContractEventFactory(contract=contract)
        
        query = f"""
            query {{
                event(id: {event.id}) {{
                    id
                    eventType
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert result.data["event"]["id"] == str(event.id)

    def test_query_contract_stats(self, contract):
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="mint")
        ContractEventFactory(contract=contract, event_type="transfer")
        
        query = f"""
            query {{
                contractStats(contractId: "{contract.contract_id}") {{
                    totalEvents
                    uniqueEventTypes
                    lastActivity
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert result.data["contractStats"]["totalEvents"] == 3
        assert result.data["contractStats"]["uniqueEventTypes"] == 2
        assert "lastActivity" in result.data["contractStats"]

    def test_query_event_types(self, contract):
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="mint")
        ContractEventFactory(contract=contract, event_type="transfer")
        
        query = f"""
            query {{
                eventTypes(contractId: "{contract.contract_id}")
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert set(result.data["eventTypes"]) == {"transfer", "mint"}

    def test_query_event_timeline_groups_events(self, contract):
        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 1, 0), UTC),
        )
        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 4, 0), UTC),
        )
        ContractEventFactory(
            contract=contract,
            event_type="burn",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 6, 0), UTC),
        )

        query = f"""
            query {{
                eventTimeline(
                    contractId: "{contract.contract_id}"
                    bucketSize: FIVE_MINUTES
                    timezone: "UTC"
                    since: "2024-02-19T20:00:00+00:00"
                    until: "2024-02-19T20:10:00+00:00"
                ) {{
                    totalEvents
                    groups {{
                        eventCount
                        eventTypeCounts {{
                            eventType
                            count
                        }}
                        events {{
                            id
                            eventType
                        }}
                    }}
                }}
            }}
        """
        result = schema.execute_sync(query)

        assert result.errors is None
        assert result.data["eventTimeline"]["totalEvents"] == 3
        assert len(result.data["eventTimeline"]["groups"]) == 2
        assert result.data["eventTimeline"]["groups"][0]["eventCount"] == 1
        assert result.data["eventTimeline"]["groups"][0]["eventTypeCounts"][0]["eventType"] == "burn"
        assert len(result.data["eventTimeline"]["groups"][0]["events"]) == 1
        assert result.data["eventTimeline"]["groups"][1]["eventCount"] == 2
        assert result.data["eventTimeline"]["groups"][1]["eventTypeCounts"][0]["eventType"] == "transfer"

    def test_query_event_timeline_filter_by_event_types(self, contract):
        current_time = timezone.now()
        ContractEventFactory(contract=contract, event_type="transfer", timestamp=current_time)
        ContractEventFactory(contract=contract, event_type="mint", timestamp=current_time)

        query = f"""
            query {{
                eventTimeline(
                    contractId: "{contract.contract_id}"
                    bucketSize: THIRTY_MINUTES
                    eventTypes: ["transfer"]
                    timezone: "UTC"
                ) {{
                    totalEvents
                    groups {{
                        eventTypeCounts {{
                            eventType
                            count
                        }}
                    }}
                }}
            }}
        """
        result = schema.execute_sync(query)

        assert result.errors is None
        assert result.data["eventTimeline"]["totalEvents"] == 1
        assert len(result.data["eventTimeline"]["groups"]) == 1
        assert result.data["eventTimeline"]["groups"][0]["eventTypeCounts"][0]["eventType"] == "transfer"

    def test_query_event_timeline_without_events_payload(self, contract):
        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.now(),
        )

        query = f"""
            query {{
                eventTimeline(
                    contractId: "{contract.contract_id}"
                    bucketSize: THIRTY_MINUTES
                    includeEvents: false
                    timezone: "UTC"
                ) {{
                    groups {{
                        eventCount
                        events {{
                            id
                        }}
                    }}
                }}
            }}
        """
        result = schema.execute_sync(query)

        assert result.errors is None
        assert result.data["eventTimeline"]["groups"][0]["eventCount"] == 1
        assert result.data["eventTimeline"]["groups"][0]["events"] == []

    def test_cursor_pagination_forward(self, contract):
        for _ in range(5):
            ContractEventFactory(contract=contract)

        query1 = """
            query {
                events(first: 2) {
                    edges { node { id } cursor }
                    pageInfo { hasNextPage endCursor }
                    totalCount
                }
            }
        """
        r1 = schema.execute_sync(query1)
        assert r1.errors is None
        assert len(r1.data["events"]["edges"]) == 2
        assert r1.data["events"]["pageInfo"]["hasNextPage"] is True
        assert r1.data["events"]["totalCount"] == 5

        cursor = r1.data["events"]["pageInfo"]["endCursor"]
        query2 = f"""
            query {{
                events(first: 2, after: "{cursor}") {{
                    edges {{ node {{ id }} cursor }}
                    pageInfo {{ hasNextPage endCursor }}
                    totalCount
                }}
            }}
        """
        r2 = schema.execute_sync(query2)
        assert r2.errors is None
        assert len(r2.data["events"]["edges"]) == 2
        assert r2.data["events"]["pageInfo"]["hasNextPage"] is True

        cursor2 = r2.data["events"]["pageInfo"]["endCursor"]
        query3 = f"""
            query {{
                events(first: 2, after: "{cursor2}") {{
                    edges {{ node {{ id }} cursor }}
                    pageInfo {{ hasNextPage endCursor }}
                    totalCount
                }}
            }}
        """
        r3 = schema.execute_sync(query3)
        assert r3.errors is None
        assert len(r3.data["events"]["edges"]) == 1
        assert r3.data["events"]["pageInfo"]["hasNextPage"] is False

    def test_first_zero_returns_empty(self, contract):
        ContractEventFactory(contract=contract)

        query = """
            query {
                events(first: 0) {
                    edges { node { id } }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 0
        assert result.data["events"]["totalCount"] == 1

    def test_invalid_cursor_ignored(self, contract):
        ContractEventFactory(contract=contract)

        query = """
            query {
                events(first: 10, after: "invalid-cursor") {
                    edges { node { id } }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1

    def test_ledger_range_filter(self, contract):
        ContractEventFactory(contract=contract, ledger=100)
        ContractEventFactory(contract=contract, ledger=200)
        ContractEventFactory(contract=contract, ledger=300)

        query = """
            query {
                events(fromLedger: 150, toLedger: 250) {
                    edges { node { id } }
                    totalCount
                }
            }
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1
        assert result.data["events"]["totalCount"] == 1

    def test_combined_filters(self, contract):
        ContractEventFactory(contract=contract, event_type="transfer", ledger=100)
        ContractEventFactory(contract=contract, event_type="mint", ledger=200)
        ContractEventFactory(contract=contract, event_type="transfer", ledger=300)

        query = f"""
            query {{
                events(
                    contractId: "{contract.contract_id}",
                    eventType: "transfer",
                    fromLedger: 50,
                    toLedger: 150
                ) {{
                    edges {{ node {{ id }} }}
                    totalCount
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["events"]["edges"]) == 1
        assert result.data["events"]["totalCount"] == 1

    def test_query_transaction_groups_cross_contract_events(self, contract):
        other_contract = TrackedContractFactory(owner=contract.owner)
        tx_id = "tx-shared-graphql"
        ContractEventFactory(contract=contract, tx_hash=tx_id, ledger=20, event_index=0)
        ContractEventFactory(contract=other_contract, tx_hash=tx_id, ledger=20, event_index=1)

        query = f"""
            query {{
                transaction(id: "{tx_id}") {{
                    id
                    contractId
                    eventType
                    transactionId
                }}
            }}
        """
        result = schema.execute_sync(query)
        assert result.errors is None
        assert len(result.data["transaction"]) == 2
        assert {row["contractId"] for row in result.data["transaction"]} == {
            contract.contract_id,
            other_contract.contract_id,
        }

@pytest.mark.django_db
class TestGraphQLMutations:
    def test_register_contract(self, user):
        mutation = """
            mutation {
                registerContract(
                    contractId: "CTEST123",
                    name: "Test Contract",
                    description: "A test"
                ) {
                    contractId
                    name
                }
            }
        """
        context = create_context_with_user(user)
        result = schema.execute_sync(mutation, context_value=context)
        assert result.errors is None
        assert result.data["registerContract"]["contractId"] == "CTEST123"

    def test_update_contract(self, contract):
        mutation = f"""
            mutation {{
                updateContract(
                    contractId: "{contract.contract_id}",
                    name: "Updated Name",
                    isActive: false
                ) {{
                    contractId
                    name
                    isActive
                }}
            }}
        """
        context = create_context_with_user(contract.owner)
        result = schema.execute_sync(mutation, context_value=context)
        assert result.errors is None
        assert result.data["updateContract"]["name"] == "Updated Name"
        assert result.data["updateContract"]["isActive"] is False

    def test_update_nonexistent_contract(self, user):
        mutation = """
            mutation {
                updateContract(
                    contractId: "NONEXISTENT",
                    name: "Updated"
                ) {
                    contractId
                }
            }
        """
        context = create_context_with_user(user)
        result = schema.execute_sync(mutation, context_value=context)
        assert result.errors is None
        assert result.data["updateContract"] is None
