// Shapes of the JSON these handlers read from GitHub.
//
// `Response.json()` returns `unknown`, which is correct: nothing has checked
// what came back. Each interface below names only the fields this codebase
// actually reads, and marks them optional wherever the code already guards
// them — so the guards stay the source of truth and the types stop pretending
// the payloads are richer than what is used.

/** GET https://api.github.com/users/:username */
export interface GitHubUser {
  avatar_url?: string;
}

/** GET https://api.github.com/user (the token's own account) */
export interface GitHubAuthenticatedUser {
  login?: string;
}

/** POST https://github.com/login/oauth/access_token */
export interface GitHubOAuthTokenResponse {
  access_token?: string;
}

/** One entry of GET https://api.github.com/users/:username/events/public */
export interface GitHubEvent {
  // The Events API always sends these two; the code reads both unguarded.
  created_at: string;
  type: string;
  repo?: { name: string };
  payload?: {
    action?: string;
    size?: number;
    commits?: unknown[];
    pull_request?: { merged?: boolean };
  };
}

/** The contributionsCollection selection in the GraphQL query below. */
export interface GitHubContributionsCollection {
  totalCommitContributions: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalIssueContributions: number;
  restrictedContributionsCount: number;
  contributionCalendar: { totalContributions: number };
}

/** POST https://api.github.com/graphql, for the query in this module. */
export interface GitHubGraphQLResponse {
  errors?: unknown;
  data?: {
    user?: {
      contributionsCollection: GitHubContributionsCollection;
    } | null;
  };
}
