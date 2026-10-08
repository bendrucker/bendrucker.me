import { graphql } from "@octokit/graphql";
import { createTokenAuth } from "@octokit/auth-token";

export type GraphQLClient = typeof graphql;

export function createClient(token: string, title: string): GraphQLClient {
  const auth = createTokenAuth(token);

  return graphql.defaults({
    request: {
      hook: auth.hook,
    },
    headers: {
      "user-agent": `${title} Activity Fetcher`,
    },
  });
}
