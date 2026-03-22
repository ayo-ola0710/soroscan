# Requirements Document

## Introduction

SoroScan currently indexes emitted events from Soroban smart contracts but does not track the contract invocations that generated those events. This feature adds contract invocation tracking to enable developers to correlate events with their calling transactions, understand call chains, and perform root-cause analysis during debugging.

The system will extract invocation data from Soroban RPC transaction responses, store invocation metadata (caller, contract, function name, parameters, result), link events to their originating invocations, and expose this data through REST and GraphQL APIs.

## Glossary

- **ContractInvocation**: A record of a single contract function call, including caller address, target contract, function name, parameters, result, and transaction hash
- **Invocation_Store**: The database persistence layer for ContractInvocation records
- **RPC_Client**: The Soroban RPC client component that fetches transaction details
- **Ingest_Pipeline**: The background task system that processes ledger data and stores events and invocations
- **Call_Graph**: A directed graph structure where nodes are invocations and edges represent invocation-to-event and event-to-downstream-invocation relationships
- **XDR**: External Data Representation format used by Stellar for encoding transaction data
- **Event_Linker**: The component that associates ContractEvent records with their originating ContractInvocation via foreign key

## Requirements

### Requirement 1: Store Contract Invocation Data

**User Story:** As a developer, I want invocation metadata persisted in the database, so that I can query historical contract calls.

#### Acceptance Criteria

1. THE Invocation_Store SHALL persist contract invocations with fields: tx_hash, caller, contract, function_name, parameters, result, ledger_sequence, created_at
2. THE Invocation_Store SHALL enforce uniqueness on the combination of tx_hash and contract
3. THE Invocation_Store SHALL create a database index on (contract, created_at) for efficient time-range queries
4. THE Invocation_Store SHALL create a database index on caller for efficient caller-based queries
5. THE Invocation_Store SHALL store parameters and result as JSON fields without decoding XDR content

### Requirement 2: Extract Invocation Data from Soroban RPC

**User Story:** As a system, I want to fetch invocation details from Soroban RPC, so that I can populate the invocation store.

#### Acceptance Criteria

1. THE RPC_Client SHALL provide a method get_invocation(tx_hash) that retrieves transaction details from Soroban RPC
2. WHEN get_invocation is called with a valid tx_hash, THE RPC_Client SHALL return caller address, contract address, function name, parameters, and result
3. WHEN get_invocation is called with an invalid tx_hash, THE RPC_Client SHALL return an error indicator
4. THE RPC_Client SHALL extract parameters and result in their XDR-encoded form without decoding
5. THE RPC_Client SHALL implement rate limiting to prevent quota exhaustion on Soroban RPC endpoints

### Requirement 3: Link Events to Invocations

**User Story:** As a developer, I want events linked to their originating invocations, so that I can trace which call generated each event.

#### Acceptance Criteria

1. THE Event_Linker SHALL add an invocation foreign key field to the ContractEvent model
2. WHEN an event is ingested, THE Event_Linker SHALL associate it with the corresponding ContractInvocation using tx_hash
3. WHEN multiple contracts emit events from the same transaction, THE Event_Linker SHALL link each event to the invocation for its respective contract
4. THE Event_Linker SHALL allow the invocation foreign key to be null for events ingested before invocation tracking was enabled
5. THE Event_Linker SHALL create a database index on the invocation foreign key for efficient join queries

### Requirement 4: Ingest Invocations During Event Processing

**User Story:** As a system, I want invocations fetched and stored automatically during event ingestion, so that invocation data stays synchronized with event data.

#### Acceptance Criteria

1. WHEN the Ingest_Pipeline processes a new event, THE Ingest_Pipeline SHALL fetch the corresponding invocation details from Soroban RPC
2. WHEN invocation details are fetched, THE Ingest_Pipeline SHALL persist them to the Invocation_Store
3. IF an invocation already exists for a given tx_hash and contract, THEN THE Ingest_Pipeline SHALL skip duplicate insertion
4. WHEN invocation fetch fails due to RPC errors, THE Ingest_Pipeline SHALL log the error and continue processing remaining events
5. THE Ingest_Pipeline SHALL cache invocation data within a single batch to avoid redundant RPC calls for the same transaction

### Requirement 5: REST API for Invocation Queries

**User Story:** As a frontend developer, I want a REST endpoint to query invocations, so that I can display call history in the UI.

#### Acceptance Criteria

1. THE REST_API SHALL provide an endpoint GET /api/contracts/{id}/invocations/ that returns invocations for a specific contract
2. WHEN the endpoint is called, THE REST_API SHALL return paginated results ordered by created_at descending
3. WHERE a caller filter is provided, THE REST_API SHALL return only invocations matching the specified caller address
4. WHERE a function_name filter is provided, THE REST_API SHALL return only invocations matching the specified function name
5. WHERE a timestamp range filter is provided, THE REST_API SHALL return only invocations within the specified time range
6. THE REST_API SHALL include related event count in each invocation response

### Requirement 6: GraphQL Query for Invocations with Events

**User Story:** As a frontend developer, I want a GraphQL query to fetch invocations and their events in one request, so that I can build call trace visualizations efficiently.

#### Acceptance Criteria

1. THE GraphQL_API SHALL provide a query invocationsForContract(contractId: String!) that returns invocations for a contract
2. WHEN the query is executed, THE GraphQL_API SHALL return invocation fields: txHash, caller, functionName, parameters, result, ledgerSequence, createdAt
3. THE GraphQL_API SHALL include a nested events field in each invocation that returns all related ContractEvent records
4. THE GraphQL_API SHALL support pagination arguments (first, after) on the invocations query
5. THE GraphQL_API SHALL support filtering by caller and functionName through query arguments

### Requirement 7: Parse Invocation Data from Transaction Response

**User Story:** As a system, I want to parse Soroban transaction responses correctly, so that I can extract accurate invocation metadata.

#### Acceptance Criteria

1. WHEN parsing a transaction response, THE RPC_Client SHALL extract the source account as the caller address
2. WHEN parsing a transaction response, THE RPC_Client SHALL extract the target contract address from the operation
3. WHEN parsing a transaction response, THE RPC_Client SHALL extract the function name from the invoke_contract operation
4. WHEN parsing a transaction response, THE RPC_Client SHALL extract parameters from the operation arguments
5. WHEN parsing a transaction response, THE RPC_Client SHALL extract the result from the transaction result XDR
6. IF the transaction response is malformed, THEN THE RPC_Client SHALL return an error without raising an exception

### Requirement 8: Handle Rate Limiting and Caching

**User Story:** As a system administrator, I want RPC queries rate-limited and cached, so that I avoid quota exhaustion and reduce latency.

#### Acceptance Criteria

1. THE RPC_Client SHALL implement a rate limiter that enforces a maximum of 10 requests per second to Soroban RPC
2. WHEN the rate limit is exceeded, THE RPC_Client SHALL queue requests and process them when capacity is available
3. THE RPC_Client SHALL cache transaction responses for 5 minutes using tx_hash as the cache key
4. WHEN a cached response exists, THE RPC_Client SHALL return the cached data without making an RPC call
5. THE RPC_Client SHALL use an LRU eviction policy with a maximum cache size of 1000 entries

### Requirement 9: Database Migration for Invocation Model

**User Story:** As a developer, I want a database migration created, so that the ContractInvocation model is added to the schema.

#### Acceptance Criteria

1. THE Migration_Tool SHALL generate a Django migration file that creates the ContractInvocation table
2. THE Migration_Tool SHALL generate a migration that adds the invocation foreign key to ContractEvent
3. THE Migration_Tool SHALL create all specified indexes in the migration
4. THE Migration_Tool SHALL create the unique constraint on (tx_hash, contract) in the migration
5. WHEN the migration is applied, THE Migration_Tool SHALL complete without errors on an existing database

### Requirement 10: Integration Test for Invocation Fetch and Linkage

**User Story:** As a developer, I want integration tests that verify invocation tracking, so that I can ensure the feature works end-to-end.

#### Acceptance Criteria

1. THE Integration_Test SHALL create a mock Soroban RPC response with transaction details
2. WHEN the Ingest_Pipeline processes an event, THE Integration_Test SHALL verify that get_invocation is called with the correct tx_hash
3. THE Integration_Test SHALL verify that a ContractInvocation record is created with correct field values
4. THE Integration_Test SHALL verify that the ContractEvent.invocation foreign key is set to the created invocation
5. THE Integration_Test SHALL verify that duplicate invocations for the same tx_hash and contract are not created
6. THE Integration_Test SHALL verify that the REST endpoint returns the created invocation
7. THE Integration_Test SHALL verify that the GraphQL query returns the invocation with nested events

### Requirement 11: Serializer for Invocation Data

**User Story:** As a backend developer, I want a serializer for ContractInvocation, so that I can convert model instances to JSON for API responses.

#### Acceptance Criteria

1. THE Invocation_Serializer SHALL serialize all ContractInvocation fields to JSON
2. THE Invocation_Serializer SHALL include a nested contract field with contract_id and name
3. THE Invocation_Serializer SHALL include an events_count field that returns the number of related events
4. WHERE events are requested, THE Invocation_Serializer SHALL include a nested events field with full ContractEvent serialization
5. THE Invocation_Serializer SHALL format created_at as an ISO 8601 timestamp string

### Requirement 12: ViewSet for Invocation REST Endpoints

**User Story:** As a backend developer, I want a ViewSet for invocation endpoints, so that I can handle REST API requests.

#### Acceptance Criteria

1. THE Invocation_ViewSet SHALL inherit from Django REST Framework ModelViewSet
2. THE Invocation_ViewSet SHALL implement list action that returns paginated invocations for a contract
3. THE Invocation_ViewSet SHALL implement retrieve action that returns a single invocation by ID
4. THE Invocation_ViewSet SHALL apply filter backends for caller, function_name, and timestamp range
5. THE Invocation_ViewSet SHALL use the Invocation_Serializer for response serialization
6. THE Invocation_ViewSet SHALL return 404 when the contract does not exist

### Requirement 13: GraphQL Type for Invocation

**User Story:** As a backend developer, I want a GraphQL type definition for invocations, so that I can expose invocation data through GraphQL.

#### Acceptance Criteria

1. THE GraphQL_Schema SHALL define an Invocation type with fields: id, txHash, caller, contract, functionName, parameters, result, ledgerSequence, createdAt
2. THE GraphQL_Schema SHALL define a nested events field on Invocation that returns a list of ContractEvent types
3. THE GraphQL_Schema SHALL define a query field invocationsForContract that accepts contractId as a required argument
4. THE GraphQL_Schema SHALL implement pagination on invocationsForContract using relay-style cursor pagination
5. THE GraphQL_Schema SHALL implement filtering arguments caller and functionName on invocationsForContract
