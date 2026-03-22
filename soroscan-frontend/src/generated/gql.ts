/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    access\n    refresh\n    user {\n      id\n      email\n    }\n  }\n}\n\nmutation RefreshToken($refresh: String!) {\n  refreshToken(refresh: $refresh) {\n    access\n    refresh\n  }\n}": typeof types.LoginDocument,
    "subscription OnContractEvent($contractId: String!) {\n  contractEvent(contractId: $contractId) {\n    id\n    eventType\n    ledgerSequence\n    timestamp\n    payload\n  }\n}": typeof types.OnContractEventDocument,
    "query GetEvents($contractId: String!, $first: Int!) {\n  events(contractId: $contractId, first: $first) {\n    edges {\n      node {\n        id\n        contractId\n        eventType\n        data\n        createdAt\n      }\n    }\n  }\n}": typeof types.GetEventsDocument,
};
const documents: Documents = {
    "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    access\n    refresh\n    user {\n      id\n      email\n    }\n  }\n}\n\nmutation RefreshToken($refresh: String!) {\n  refreshToken(refresh: $refresh) {\n    access\n    refresh\n  }\n}": types.LoginDocument,
    "subscription OnContractEvent($contractId: String!) {\n  contractEvent(contractId: $contractId) {\n    id\n    eventType\n    ledgerSequence\n    timestamp\n    payload\n  }\n}": types.OnContractEventDocument,
    "query GetEvents($contractId: String!, $first: Int!) {\n  events(contractId: $contractId, first: $first) {\n    edges {\n      node {\n        id\n        contractId\n        eventType\n        data\n        createdAt\n      }\n    }\n  }\n}": types.GetEventsDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    access\n    refresh\n    user {\n      id\n      email\n    }\n  }\n}\n\nmutation RefreshToken($refresh: String!) {\n  refreshToken(refresh: $refresh) {\n    access\n    refresh\n  }\n}"): (typeof documents)["mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    access\n    refresh\n    user {\n      id\n      email\n    }\n  }\n}\n\nmutation RefreshToken($refresh: String!) {\n  refreshToken(refresh: $refresh) {\n    access\n    refresh\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "subscription OnContractEvent($contractId: String!) {\n  contractEvent(contractId: $contractId) {\n    id\n    eventType\n    ledgerSequence\n    timestamp\n    payload\n  }\n}"): (typeof documents)["subscription OnContractEvent($contractId: String!) {\n  contractEvent(contractId: $contractId) {\n    id\n    eventType\n    ledgerSequence\n    timestamp\n    payload\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetEvents($contractId: String!, $first: Int!) {\n  events(contractId: $contractId, first: $first) {\n    edges {\n      node {\n        id\n        contractId\n        eventType\n        data\n        createdAt\n      }\n    }\n  }\n}"): (typeof documents)["query GetEvents($contractId: String!, $first: Int!) {\n  events(contractId: $contractId, first: $first) {\n    edges {\n      node {\n        id\n        contractId\n        eventType\n        data\n        createdAt\n      }\n    }\n  }\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;