// Authored pull requests and issues, read one by one. The contributions pass
// names them by id, and this reads the details it cannot: a diff and a
// reaction count on every pull request of a window exceed GitHub's resource
// limits for one query, while a hundred at a time by id costs a single point.
import { GraphqlResponseError } from "@octokit/graphql";
import { logger } from "@workspace/logger";
import { createClient, type GraphQLClient } from "./client";
import {
  workNodesResponse,
  type IssueFields,
  type PullRequestFields,
} from "./schema";

export interface RepositoryRef {
  owner: string;
  name: string;
}

export interface PullRequest {
  /** GitHub's node id. */
  id: string;
  repository: RepositoryRef;
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  createdAt: Date;
  mergedAt: Date | null;
  additions: number;
  deletions: number;
  /** Every reaction of every kind. */
  reactions: number;
}

export interface Issue {
  /** GitHub's node id. */
  id: string;
  repository: RepositoryRef;
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  /** `COMPLETED`, `NOT_PLANNED`, and so on, or null while open. */
  stateReason: string | null;
  createdAt: Date;
  closedAt: Date | null;
  reactions: number;
}

export interface WorkItems {
  pullRequests: PullRequest[];
  issues: Issue[];
}

const date = (value: string | null) =>
  value === null ? null : new Date(value);

const repositoryRef = (fields: PullRequestFields | IssueFields) => ({
  owner: fields.repository.owner.login,
  name: fields.repository.name,
});

export function toPullRequest(fields: PullRequestFields): PullRequest {
  return {
    id: fields.id,
    repository: repositoryRef(fields),
    number: fields.number,
    title: fields.title,
    state: fields.state,
    isDraft: fields.isDraft,
    createdAt: new Date(fields.createdAt),
    mergedAt: date(fields.mergedAt),
    additions: fields.additions,
    deletions: fields.deletions,
    reactions: fields.reactions.totalCount,
  };
}

export function toIssue(fields: IssueFields): Issue {
  return {
    id: fields.id,
    repository: repositoryRef(fields),
    number: fields.number,
    title: fields.title,
    state: fields.state,
    stateReason: fields.stateReason,
    createdAt: new Date(fields.createdAt),
    closedAt: date(fields.closedAt),
    reactions: fields.reactions.totalCount,
  };
}

const WORK_NODES_QUERY = `
  fragment RepositoryRef on Repository {
    name
    owner {
      login
    }
  }

  query WorkNodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on PullRequest {
        id
        number
        title
        state
        isDraft
        createdAt
        mergedAt
        additions
        deletions
        reactions {
          totalCount
        }
        repository {
          ...RepositoryRef
        }
      }
      ... on Issue {
        id
        number
        title
        state
        stateReason
        createdAt
        closedAt
        reactions {
          totalCount
        }
        repository {
          ...RepositoryRef
        }
      }
    }
  }
`;

// An id that no longer resolves (a deleted issue, a repository deleted or out
// of the token's reach) comes back as a null node beside a NOT_FOUND or
// FORBIDDEN error, and the client throws on any error. Those errors are kept
// to their own nodes, so the rest of the page is still good. Anything else is
// a real failure and is rethrown.
const UNRESOLVED_NODE_ERRORS = new Set(["NOT_FOUND", "FORBIDDEN"]);

async function queryWorkNodes(
  client: GraphQLClient,
  ids: readonly string[],
): Promise<unknown> {
  try {
    return await client(WORK_NODES_QUERY, { ids });
  } catch (error) {
    if (!(error instanceof GraphqlResponseError)) throw error;

    const errors = error.errors ?? [];
    const unresolvedOnly =
      errors.length > 0 &&
      errors.every(
        (entry) =>
          UNRESOLVED_NODE_ERRORS.has(entry.type) && entry.path[0] === "nodes",
      );
    if (!unresolvedOnly) throw error;

    logger.warn(
      { errors: errors.map(({ type, message }) => ({ type, message })) },
      "Some pull requests or issues no longer resolve",
    );
    return error.data;
  }
}

// `nodes` accepts at most 100 ids a call.
const NODES_PAGE_SIZE = 100;

export async function fetchWorkItems(
  token: string,
  ids: readonly string[],
  title: string,
): Promise<WorkItems> {
  const client = createClient(token, title);
  const work: WorkItems = { pullRequests: [], issues: [] };

  for (let i = 0; i < ids.length; i += NODES_PAGE_SIZE) {
    const { nodes } = workNodesResponse.parse(
      await queryWorkNodes(client, ids.slice(i, i + NODES_PAGE_SIZE)),
    );

    for (const node of nodes) {
      if (node?.__typename === "PullRequest") {
        work.pullRequests.push(toPullRequest(node));
      } else if (node?.__typename === "Issue") {
        work.issues.push(toIssue(node));
      }
    }
  }

  return work;
}
