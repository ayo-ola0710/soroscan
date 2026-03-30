"""
Property-based tests for the Contract Metadata Registry.
Feature: contract-metadata-registry
"""
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from soroscan.ingest.models import ContractMetadata
from soroscan.ingest.tests.factories import ContractMetadataFactory, TrackedContractFactory


# Feature: contract-metadata-registry, Property 2: Cascade delete
class TestCascadeDeleteProperty(TestCase):
    @given(st.data())
    @settings(max_examples=20)
    def test_cascade_delete(self, data):
        """
        For any TrackedContract with an associated ContractMetadata,
        deleting the TrackedContract should also delete the ContractMetadata.
        Validates: Requirements 1.3
        """
        contract = TrackedContractFactory()
        meta = ContractMetadataFactory(contract=contract, name="Test Metadata")
        meta_pk = meta.pk

        contract.delete()

        assert not ContractMetadata.objects.filter(pk=meta_pk).exists()


# Feature: contract-metadata-registry, Property 1: Metadata round-trip
class TestMetadataRoundTripProperty(TestCase):
    @given(
        name=st.text(min_size=1, max_size=256),
        description=st.text(),
        tags=st.lists(st.text(min_size=1, max_size=50), max_size=10),
    )
    @settings(max_examples=50)
    def test_metadata_round_trip(self, name, description, tags):
        """
        For any valid ContractMetadata record, reading it back after writing
        should return identical field values.
        Validates: Requirements 1.1, 4.1, 6.1, 6.2, 6.3
        """
        contract = TrackedContractFactory()
        meta = ContractMetadata.objects.create(
            contract=contract,
            name=name,
            description=description,
            tags=tags,
        )
        fetched = ContractMetadata.objects.get(pk=meta.pk)
        assert fetched.name == name
        assert fetched.description == description
        assert fetched.tags == tags
        # Empty tags list should come back as empty list, not null
        if not tags:
            assert fetched.tags == []
