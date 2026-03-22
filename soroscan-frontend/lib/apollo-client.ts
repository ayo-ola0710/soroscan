import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
  split,
  Operation,
  NextLink,
  Observable,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getMainDefinition } from '@apollo/client/utilities';
import { getAccessToken, clearTokens, refreshAccessToken } from './auth';

// HTTP Link – connects to the GraphQL endpoint
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql/',
  credentials: 'include', // Include cookies for session-based auth
});

// Auth Link – adds JWT token to request headers
const authLink = new ApolloLink((operation: Operation, forward: NextLink) => {
  const token = getAccessToken();

  if (token) {
    operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    }));
  }

  return forward(operation);
});

// Error Link – handles GraphQL and network errors, refreshes JWT on 401
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const error of graphQLErrors) {
      const { message, extensions } = error;
      console.error(`[GraphQL error]: Message: ${message}`);

      // Handle authentication errors (401 / UNAUTHENTICATED)
      if (extensions?.code === 'UNAUTHENTICATED' || extensions?.status === 401) {
        console.warn('Authentication token invalid or expired. Attempting refresh...');

        return new Observable((observer) => {
          refreshAccessToken()
            .then((newToken) => {
              if (!newToken) {
                clearTokens();
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                }
                observer.complete();
                return;
              }

              // Re-set headers with new token then retry
              operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
                headers: {
                  ...headers,
                  authorization: `Bearer ${newToken}`,
                },
              }));

              // Replay the request
              const subscriber = {
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              };
              forward(operation).subscribe(subscriber);
            })
            .catch(observer.error.bind(observer));
        });
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Retry Link – retries transient network failures (not GraphQL errors)
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error: Error) => {
      return !!error && !error.message.includes('GraphQL error');
    },
  },
});

// ── WebSocket Link ────────────────────────────────────────────────────
// Lazily imported so SSR environments (Node.js) are not affected.
// The split() below routes subscription operations over WS; all other
// operations continue over the existing HTTP link chain.
// ─────────────────────────────────────────────────────────────────────
function buildLink(): ApolloLink {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (typeof window !== 'undefined' && wsUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GraphQLWsLink } = require('@apollo/client/link/subscriptions') as typeof import('@apollo/client/link/subscriptions');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('graphql-ws') as typeof import('graphql-ws');

    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsUrl,
        // Exponential back-off: 1 s, 2 s, 4 s … capped at 30 s
        retryAttempts: Infinity,
        retryWait: (retries) =>
          new Promise((resolve) =>
            setTimeout(resolve, Math.min(2 ** retries * 1000, 30_000))
          ),
        shouldRetry: () => true,
      })
    );

    // Route subscriptions over WS; all other operations over HTTP.
    return split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return (
          def.kind === 'OperationDefinition' &&
          def.operation === 'subscription'
        );
      },
      wsLink,
      from([errorLink, retryLink, authLink, httpLink]),
    );
  }

  // SSR or no WS URL configured – use HTTP-only chain.
  return from([errorLink, retryLink, authLink, httpLink]);
}

// Apollo Client instance
export const client = new ApolloClient({
  link: buildLink(),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          events: {
            keyArgs: ['filters'],
            merge(existing: unknown[] = [], incoming: unknown[]) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
  },
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
