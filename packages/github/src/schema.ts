// Runtime shapes for the GraphQL responses in `index.ts`, covering the fields
// the aggregation reads. Each schema follows the nullability the API declares
// for the field, so a response that stopped matching its query fails here
// rather than reaching the aggregation as an empty result.
import { z } from "zod";

// The RepositoryInfo fragment, shared by every query.
const repository = z.object({
  name: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable(),
  url: z.string(),
  createdAt: z.string(),
  isFork: z.boolean(),
  stargazerCount: z.number(),
  primaryLanguage: z
    .object({ name: z.string(), color: z.string().nullable() })
    .nullable(),
});

export type Repository = z.infer<typeof repository>;

// A connection's `nodes` is nullable, and so is every entry in it. Callers
// only ever iterate, so both collapse to an empty list here.
function nodes<T extends z.ZodType>(node: T) {
  return z
    .array(node.nullable())
    .nullish()
    .transform((entries) => (entries ?? []).filter((entry) => entry !== null));
}

// `contributionsCollection` declares each of its per-repository lists as
// `[T!]!`, so an absent one means the query no longer matches the API rather
// than a window with no activity. Only the `nodes` inside them are nullable.
function contributionsByRepository<T extends z.ZodType>(node: T) {
  return z.array(
    z.object({
      repository,
      contributions: z.object({ nodes: nodes(node) }),
    }),
  );
}

const contributionsCollection = z.object({
  commitContributionsByRepository: z.array(
    z.object({
      repository,
      contributions: z.object({
        totalCount: z.number(),
        nodes: nodes(z.object({ occurredAt: z.string() })),
      }),
    }),
  ),
  pullRequestContributionsByRepository: contributionsByRepository(
    z.object({
      occurredAt: z.string(),
      pullRequest: z.object({
        merged: z.boolean(),
        mergedAt: z.string().nullable(),
      }),
    }),
  ),
  pullRequestReviewContributionsByRepository: contributionsByRepository(
    z.object({
      occurredAt: z.string(),
      pullRequest: z.object({
        author: z
          .object({ login: z.string(), __typename: z.string() })
          .nullable(),
      }),
    }),
  ),
  // Only the count is read, to warn that the page hit its limit.
  issueContributionsByRepository: z.array(z.unknown()),
  repositoryContributions: z.object({
    nodes: nodes(z.object({ repository, occurredAt: z.string() })),
  }),
});

export type ContributionsCollection = z.infer<typeof contributionsCollection>;

const rateLimit = z.object({
  remaining: z.number(),
  cost: z.number(),
  resetAt: z.string(),
});

export type RateLimit = z.infer<typeof rateLimit>;

export const contributionsResponse = z.object({
  user: z.object({ contributionsCollection }).nullable(),
  rateLimit: rateLimit.nullable(),
});

const issueNode = z.object({
  __typename: z.literal("Issue"),
  createdAt: z.string(),
  repository,
});

export type IssueNode = z.infer<typeof issueNode>;

const mergedPullRequestNode = z.object({
  __typename: z.literal("PullRequest"),
  createdAt: z.string(),
  merged: z.boolean(),
  mergedBy: z.object({ login: z.string() }).nullable(),
  author: z.object({ login: z.string() }).nullable(),
  repository,
});

export type MergedPullRequestNode = z.infer<typeof mergedPullRequestNode>;

// A page announcing a successor has to carry the cursor that reaches it.
// Pairing the two fields keeps a response that sets one without the other from
// sending the caller back to the first page for as long as it keeps paginating.
const pageInfo = z.discriminatedUnion("hasNextPage", [
  z.object({ hasNextPage: z.literal(false) }),
  z.object({ hasNextPage: z.literal(true), endCursor: z.string() }),
]);

export interface SearchPage<T> {
  search: {
    pageInfo: z.infer<typeof pageInfo>;
    nodes: T[];
  };
}

// `search` returns whatever matched, so a node of another type is dropped on
// its `__typename` before the shape is checked. Discarding by type first is
// what keeps a renamed field an error here rather than a silently empty page.
function searchPage<
  T extends z.ZodObject<{ __typename: z.ZodLiteral<string> }>,
>(node: T) {
  const typename = node.shape.__typename.value;
  return z.object({
    search: z.object({
      pageInfo,
      nodes: nodes(z.looseObject({ __typename: z.string() }))
        .transform((entries) =>
          entries.filter((entry) => entry.__typename === typename),
        )
        .pipe(z.array(node)),
    }),
  });
}

export const issueSearchPage = searchPage(issueNode);
export const mergedPullRequestSearchPage = searchPage(mergedPullRequestNode);
