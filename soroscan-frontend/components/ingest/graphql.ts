import type { ContractInfo, EventRecord, EventTimelineResult, TimelineBucketSize } from "@/components/ingest/types";

interface GraphQLErrorItem {
  message: string;
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLErrorItem[];
}

async function parseResponse<TData>(response: Response): Promise<TData> {
  let payload: GraphQLResponse<TData>;

  try {
    payload = (await response.json()) as GraphQLResponse<TData>;
  } catch {
    throw new Error("GraphQL response was not valid JSON.");
  }

  if (!response.ok) {
    const errorMessage = payload.errors?.map((item) => item.message).join("; ");
    throw new Error(errorMessage || `GraphQL request failed with status ${response.status}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  if (!payload.data) {
    throw new Error("GraphQL response did not include data.");
  }

  return payload.data;
}

export async function graphqlRequest<TData, TVariables>(
  query: string,
  variables: TVariables,
): Promise<TData> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  return parseResponse<TData>(response);
}

export const CONTRACT_QUERY = `
  query Contract($contractId: String!) {
    contract(contractId: $contractId) {
      contractId
      name
    }
  }
`;

export const ALL_CONTRACTS_QUERY = `
  query AllContracts {
    contracts {
      contractId
      name
    }
  }
`;

export const EVENT_TYPES_QUERY = `
  query EventTypes($contractId: String!) {
    eventTypes(contractId: $contractId)
  }
`;

export const EVENT_TIMELINE_QUERY = `
  query EventTimeline(
    $contractId: String!
    $bucketSize: TimelineBucketSize!
    $eventTypes: [String!]
    $timezone: String!
    $includeEvents: Boolean!
    $limitGroups: Int!
  ) {
    eventTimeline(
      contractId: $contractId
      bucketSize: $bucketSize
      eventTypes: $eventTypes
      timezone: $timezone
      includeEvents: $includeEvents
      limitGroups: $limitGroups
    ) {
      contractId
      bucketSize
      since
      until
      totalEvents
      groups {
        start
        end
        eventCount
        eventTypeCounts {
          eventType
          count
        }
        events {
          id
          contractId
          contractName
          eventType
          ledger
          eventIndex
          timestamp
          txHash
          payload
        }
      }
    }
  }
`;

export const EXPLORER_EVENTS_QUERY = `
  query ExplorerEvents(
    $contractId: String!
    $eventType: String
    $limit: Int!
    $offset: Int!
    $since: DateTime
    $until: DateTime
  ) {
    events(
      contractId: $contractId
      eventType: $eventType
      limit: $limit
      offset: $offset
      since: $since
      until: $until
    ) {
      id
      eventType
      ledger
      eventIndex
      timestamp
      txHash
      payload
      contractId
      contractName
    }
  }
`;

export const ALL_EVENTS_QUERY = `
  query AllEvents(
    $eventType: String
    $limit: Int!
    $offset: Int!
    $since: DateTime
    $until: DateTime
  ) {
    allEvents(
      eventType: $eventType
      limit: $limit
      offset: $offset
      since: $since
      until: $until
    ) {
      id
      eventType
      ledger
      eventIndex
      timestamp
      txHash
      payload
      contractId
      contractName
    }
  }
`;

export const GET_SYSTEM_METRICS_QUERY = `
  query GetSystemMetrics {
    systemMetrics {
      eventsIndexedToday
      eventsIndexedTotal
      webhookSuccessRate
      avgWebhookDeliveryTime
      activeContracts
      lastSynced
      dbStatus
      redisStatus
    }
    recentErrors(limit: 10) {
      id
      timestamp
      level
      message
      context
    }
  }
`;

export const EVENTS_EXPORT_QUERY = `
  query EventsExport(
    $contractId: String!
    $eventType: String
    $limit: Int!
    $offset: Int!
    $since: DateTime
    $until: DateTime
  ) {
    events(
      contractId: $contractId
      eventType: $eventType
      limit: $limit
      offset: $offset
      since: $since
      until: $until
    ) {
      id
      contractId
      contractName
      eventType
      ledger
      eventIndex
      timestamp
      txHash
      payload
      payloadHash
      schemaVersion
      validationStatus
    }
  }
`;

interface ContractQueryResult {
  contract: ContractInfo | null;
}

interface AllContractsQueryResult {
  contracts: ContractInfo[];
}

interface EventTypesQueryResult {
  eventTypes: string[];
}

interface TimelineQueryResult {
  eventTimeline: EventTimelineResult;
}

interface EventsQueryResult {
  events: EventRecord[];
}

export async function fetchContract(contractId: string): Promise<ContractInfo | null> {
  const data = await graphqlRequest<ContractQueryResult, { contractId: string }>(
    CONTRACT_QUERY,
    { contractId },
  );
  return data.contract;
}

export async function fetchAllContracts(): Promise<ContractInfo[]> {
  const data = await graphqlRequest<AllContractsQueryResult, Record<string, never>>(
    ALL_CONTRACTS_QUERY,
    {},
  );
  return data.contracts ?? [];
}

export async function fetchEventTypes(contractId: string): Promise<string[]> {
  const data = await graphqlRequest<EventTypesQueryResult, { contractId: string }>(
    EVENT_TYPES_QUERY,
    { contractId },
  );
  return data.eventTypes ?? [];
}

interface TimelineVariables {
  contractId: string;
  bucketSize: TimelineBucketSize;
  eventTypes: string[] | null;
  timezone: string;
  includeEvents: boolean;
  limitGroups: number;
}

export async function fetchTimeline(variables: TimelineVariables): Promise<EventTimelineResult> {
  const data = await graphqlRequest<TimelineQueryResult, TimelineVariables>(
    EVENT_TIMELINE_QUERY,
    variables,
  );
  return data.eventTimeline;
}

interface EventsVariables {
  contractId: string | null;
  eventType: string | null;
  limit: number;
  offset: number;
  since: string | null;
  until: string | null;
}

interface AllEventsVariables {
  eventType: string | null;
  limit: number;
  offset: number;
  since: string | null;
  until: string | null;
}

export async function fetchExplorerEvents(variables: EventsVariables): Promise<EventRecord[]> {
  // If no contractId, fetch all events
  if (!variables.contractId) {
    const allEventsVars: AllEventsVariables = {
      eventType: variables.eventType,
      limit: variables.limit,
      offset: variables.offset,
      since: variables.since,
      until: variables.until,
    };
    
    const data = await graphqlRequest<{ allEvents: EventRecord[] }, AllEventsVariables>(
      ALL_EVENTS_QUERY,
      allEventsVars,
    );
    return data.allEvents ?? [];
  }

  const data = await graphqlRequest<EventsQueryResult, { contractId: string; eventType: string | null; limit: number; offset: number; since: string | null; until: string | null }>(
    EXPLORER_EVENTS_QUERY,
    {
      contractId: variables.contractId,
      eventType: variables.eventType,
      limit: variables.limit,
      offset: variables.offset,
      since: variables.since,
      until: variables.until,
    },
  );
  return data.events ?? [];
}

export async function fetchEventsForExport(variables: EventsVariables): Promise<EventRecord[]> {
  const data = await graphqlRequest<EventsQueryResult, EventsVariables>(
    EVENTS_EXPORT_QUERY,
    variables,
  );
  return data.events ?? [];
}

export interface SystemMetricsData {
  systemMetrics: {
    eventsIndexedToday: number;
    eventsIndexedTotal: number;
    webhookSuccessRate: number;
    avgWebhookDeliveryTime: number;
    activeContracts: number;
    lastSynced: string | null;
    dbStatus: string;
    redisStatus: string;
  };
  recentErrors: Array<{
    id: number | string;
    timestamp: string;
    level: "ERROR" | "WARNING" | "INFO";
    message: string;
    context?: string;
  }>;
}

export async function fetchSystemMetrics(): Promise<SystemMetricsData> {
  return graphqlRequest<SystemMetricsData, Record<string, never>>(
    GET_SYSTEM_METRICS_QUERY,
    {},
  );
}
