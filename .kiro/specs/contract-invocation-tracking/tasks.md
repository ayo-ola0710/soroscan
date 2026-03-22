# Implementation Plan: Contract Invocation Tracking

## Overview

This implementation plan breaks down the contract invocation tracking feature into discrete coding tasks. The feature adds invocation tracking to SoroScan's event indexing system, enabling developers to correlate events with their calling transactions and understand call chains.

The implementation follows this sequence:
1. Database models and migrations
2. RPC client enhancements (rate limiting, caching, parsing)
3. Ingest pipeline integration
4. REST API (serializers, viewsets, URL routing)
5. GraphQL schema additions
6. Testing (property-based tests and unit tests)
7. Integration testing

## Tasks

- [x] 1. Set up database models and migrations
  - [x] 1.1 Create ContractInvocation model
    - Define model with fields: tx_hash, caller, contract (FK), function_name, parameters (JSON), result (JSON), ledger_sequence, created_at
    - Add Meta class with ordering, indexes, and unique constraint on (tx_hash, contract)
    - Implement __str__ method
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.2 Add invocation foreign key to ContractEvent model
    - Add nullable ForeignKey field to ContractInvocation with related_name="events"
    - Add index on invocation field in Meta.indexes
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [x] 1.3 Generate and verify database migration
    - Run makemigrations to create migration file
    - Verify migration creates ContractInvocation table with all indexes
    - Verify migration adds invocation FK to ContractEvent
    - Verify unique constraint on (tx_hash, contract) is created
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 1.4 Write property test for invocation persistence round-trip
    - **Property 1: Invocation Persistence Round-Trip**
    - **Validates: Requirements 1.1, 1.5**
  
  - [ ]* 1.5 Write property test for unique constraint enforcement
    - **Property 2: Unique Constraint Enforcement**
    - **Validates: Requirements 1.2, 4.3**
  
  - [ ]* 1.6 Write property test for XDR preservation
    - **Property 3: XDR Preservation**
    - **Validates: Requirements 1.5, 2.4**

- [x] 2. Implement RPC client enhancements
  - [x] 2.1 Create InvocationData dataclass
    - Define dataclass with fields: caller, contract, function_name, parameters, result, ledger_sequence, success, error
    - _Requirements: 2.2_
  
  - [x] 2.2 Implement RateLimiter class
    - Create token bucket rate limiter with configurable rate (default 10 req/s)
    - Implement acquire() method that blocks until token available
    - Use threading.Lock for thread safety
    - _Requirements: 2.5, 8.1, 8.2_
  
  - [x] 2.3 Add caching infrastructure to SorobanClient
    - Add __init__ method with _rate_limiter, _invocation_cache dict, _cache_ttl (300s), _cache_max_size (1000)
    - Implement _get_from_cache(tx_hash) method with TTL check
    - Implement _add_to_cache(tx_hash, data) method with LRU eviction
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [x] 2.4 Implement transaction response parsing
    - Create _parse_transaction_response(tx_response) method
    - Extract source account as caller
    - Extract contract address and function name from first invoke_contract operation
    - Extract parameters from operation arguments (keep as XDR-encoded dict)
    - Extract result from transaction result_xdr
    - Return InvocationData with success=True on success, success=False with error message on parse failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [x] 2.5 Implement get_invocation method
    - Check cache first using _get_from_cache
    - Acquire rate limiter token
    - Fetch transaction from Soroban RPC using server.get_transaction
    - Handle NOT_FOUND status and return error InvocationData
    - Parse response using _parse_transaction_response
    - Cache result using _add_to_cache
    - Handle exceptions and return error InvocationData
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 2.6 Write property test for valid transaction parsing
    - **Property 4: RPC Client Valid Transaction Parsing**
    - **Validates: Requirements 2.2, 7.1, 7.2, 7.3, 7.4, 7.5**
  
  - [ ]* 2.7 Write property test for invalid transaction handling
    - **Property 5: RPC Client Invalid Transaction Handling**
    - **Validates: Requirements 2.3, 7.6**
  
  - [ ]* 2.8 Write property test for rate limiting enforcement
    - **Property 6: Rate Limiting Enforcement**
    - **Validates: Requirements 2.5, 8.1, 8.2**
  
  - [ ]* 2.9 Write property test for cache hit efficiency
    - **Property 21: Cache Hit Efficiency**
    - **Validates: Requirements 8.3, 8.4**
  
  - [ ]* 2.10 Write property test for LRU cache eviction
    - **Property 22: LRU Cache Eviction**
    - **Validates: Requirements 8.5**
  
  - [ ]* 2.11 Write unit tests for RPC client
    - Test rate limiter with time-based assertions
    - Test cache behavior with controlled time progression
    - Mock Soroban RPC responses for various transaction types
    - Test error handling for malformed responses

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate invocation tracking into ingest pipeline
  - [x] 4.1 Implement _fetch_and_store_invocation helper function
    - Accept tx_hash, contract, client, batch_cache parameters
    - Check batch_cache first using cache_key = f"{tx_hash}:{contract.contract_id}"
    - Call client.get_invocation(tx_hash)
    - Log warning and return None if invocation_data.success is False
    - Verify invocation_data.contract matches contract.contract_id
    - Use update_or_create to upsert ContractInvocation
    - Cache result in batch_cache
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.2 Enhance _upsert_contract_event function
    - Add optional client and batch_cache parameters
    - After event creation, check if client provided and tx_hash exists
    - If invocation not already linked, call _fetch_and_store_invocation
    - Set event_obj.invocation and save with update_fields=["invocation"]
    - _Requirements: 3.2, 4.1, 4.2_
  
  - [x] 4.3 Update sync_events_from_horizon task
    - Initialize SorobanClient instance
    - Create batch_cache dict
    - Pass client and batch_cache to _upsert_contract_event calls
    - _Requirements: 4.1, 4.5_
  
  - [ ]* 4.4 Write property test for event-invocation linking
    - **Property 7: Event-Invocation Linking**
    - **Validates: Requirements 3.2, 4.1, 4.2**
  
  - [ ]* 4.5 Write property test for multi-contract transaction linking
    - **Property 8: Multi-Contract Transaction Linking**
    - **Validates: Requirements 3.3**
  
  - [ ]* 4.6 Write property test for nullable invocation foreign key
    - **Property 9: Nullable Invocation Foreign Key**
    - **Validates: Requirements 3.4**
  
  - [ ]* 4.7 Write property test for batch caching efficiency
    - **Property 10: Batch Caching Efficiency**
    - **Validates: Requirements 4.5**
  
  - [ ]* 4.8 Write property test for error resilience
    - **Property 11: Error Resilience**
    - **Validates: Requirements 4.4**
  
  - [ ]* 4.9 Write unit tests for ingest pipeline
    - Mock RPC client and test event processing flow
    - Test batch caching with multiple events
    - Test error handling when RPC fails
    - Test invocation linking logic

- [x] 5. Implement REST API serializers and viewsets
  - [x] 5.1 Create ContractInvocationSerializer
    - Inherit from serializers.ModelSerializer
    - Add contract_id and contract_name as read-only fields from contract FK
    - Add events_count as SerializerMethodField with get_events_count method
    - Add optional events field with ContractEventSerializer(many=True)
    - Define Meta with all fields and read_only_fields
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 5.2 Create ContractInvocationViewSet
    - Inherit from viewsets.ReadOnlyModelViewSet
    - Set serializer_class to ContractInvocationSerializer
    - Configure filter_backends with DjangoFilterBackend and OrderingFilter
    - Set filterset_fields to ["caller", "function_name"]
    - Set ordering to ["-created_at"]
    - Implement get_queryset to filter by contract_id from kwargs and user ownership
    - Implement list action with timestamp range filtering (since, until query params)
    - Add include_events flag support in get_serializer_context
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2, 12.3, 12.4_
  
  - [x] 5.3 Add URL routing for invocation endpoints
    - Register ContractInvocationViewSet with router
    - Add nested route under /api/contracts/{contract_id}/invocations/
    - Add standalone route /api/invocations/{id}/ for retrieve action
    - _Requirements: 5.1, 12.3_
  
  - [ ]* 5.4 Write property test for REST API pagination and ordering
    - **Property 12: REST API Pagination and Ordering**
    - **Validates: Requirements 5.2, 12.2**
  
  - [ ]* 5.5 Write property test for REST API caller filtering
    - **Property 13: REST API Caller Filtering**
    - **Validates: Requirements 5.3, 12.4**
  
  - [ ]* 5.6 Write property test for REST API function name filtering
    - **Property 14: REST API Function Name Filtering**
    - **Validates: Requirements 5.4, 12.4**
  
  - [ ]* 5.7 Write property test for REST API timestamp range filtering
    - **Property 15: REST API Timestamp Range Filtering**
    - **Validates: Requirements 5.5, 12.4**
  
  - [ ]* 5.8 Write property test for REST API events count
    - **Property 16: REST API Events Count**
    - **Validates: Requirements 5.6, 11.3**
  
  - [ ]* 5.9 Write property test for serializer field completeness
    - **Property 23: Serializer Field Completeness**
    - **Validates: Requirements 11.1, 11.2, 11.3**
  
  - [ ]* 5.10 Write property test for conditional events serialization
    - **Property 24: Conditional Events Serialization**
    - **Validates: Requirements 11.4**
  
  - [ ]* 5.11 Write property test for ISO 8601 timestamp formatting
    - **Property 25: ISO 8601 Timestamp Formatting**
    - **Validates: Requirements 11.5**
  
  - [ ]* 5.12 Write property test for ViewSet retrieve action
    - **Property 26: ViewSet Retrieve Action**
    - **Validates: Requirements 12.3, 12.6**
  
  - [ ]* 5.13 Write unit tests for REST API
    - Test endpoint existence and authentication
    - Test pagination with known datasets
    - Test filtering with specific values
    - Test error responses (404, 400)

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement GraphQL schema additions
  - [x] 7.1 Create InvocationType
    - Use @strawberry_django.type decorator on ContractInvocation model
    - Define fields: id, tx_hash, caller, function_name, parameters (JSON), result (JSON), ledger_sequence, created_at
    - Add contract_id field method that returns self.contract.contract_id
    - Add contract_name field method that returns self.contract.name
    - Add events field method that returns list(self.events.all())
    - _Requirements: 6.2, 6.3, 13.1, 13.2_
  
  - [x] 7.2 Create InvocationEdge and InvocationConnection types
    - Define InvocationEdge with node (InvocationType) and cursor (str)
    - Define InvocationConnection with edges, page_info (PageInfo), total_count
    - _Requirements: 6.4, 13.4_
  
  - [x] 7.3 Add invocations_for_contract query to Query class
    - Accept parameters: contract_id (required), caller (optional), function_name (optional), first (default 20), after (optional)
    - Filter queryset by contract_id, caller, function_name
    - Implement cursor-based pagination with base64 encoding
    - Return InvocationConnection with edges and page_info
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 13.3, 13.4, 13.5_
  
  - [ ]* 7.4 Write property test for GraphQL query field completeness
    - **Property 17: GraphQL Query Field Completeness**
    - **Validates: Requirements 6.2, 13.1**
  
  - [ ]* 7.5 Write property test for GraphQL nested events
    - **Property 18: GraphQL Nested Events**
    - **Validates: Requirements 6.3, 13.2**
  
  - [ ]* 7.6 Write property test for GraphQL pagination
    - **Property 19: GraphQL Pagination**
    - **Validates: Requirements 6.4, 13.4**
  
  - [ ]* 7.7 Write property test for GraphQL filtering
    - **Property 20: GraphQL Filtering**
    - **Validates: Requirements 6.5, 13.5**
  
  - [ ]* 7.8 Write unit tests for GraphQL API
    - Test query execution with known datasets
    - Test nested event resolution
    - Test pagination cursor handling
    - Test filtering arguments

- [x] 8. Integration testing
  - [ ]* 8.1 Write end-to-end integration test
    - Create mock Soroban RPC with transaction data
    - Trigger event ingestion via sync_events_from_horizon
    - Verify ContractInvocation created with correct field values
    - Verify ContractEvent.invocation FK set correctly
    - Verify duplicate invocations not created for same tx_hash and contract
    - Query via REST API and verify response structure
    - Query via GraphQL and verify response with nested events
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ]* 8.2 Write database migration integration test
    - Test migration on empty database
    - Test migration on database with existing events
    - Verify all indexes created using database introspection
    - Verify unique constraint enforced by attempting duplicate insert
    - _Requirements: 9.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use hypothesis library with minimum 100 iterations
- All property tests must include docstring: "Feature: contract-invocation-tracking, Property {N}: {Title}"
- Checkpoints ensure incremental validation at logical breakpoints
- The implementation uses Python with Django framework and Django REST Framework
- GraphQL implementation uses Strawberry Django
