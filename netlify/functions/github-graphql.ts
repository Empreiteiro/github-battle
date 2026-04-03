// GitHub GraphQL API client for fetching contribution data
// Uses GITHUB_TOKEN env var — includes private contributions if the user enabled them

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

interface ContributionStats {
  commits: number;
  pullRequests: number;
  pullRequestsMerged: number;
  issues: number;
  reviews: number;
  comments: number;
}

interface GraphQLContributionsResponse {
  data?: {
    user?: {
      contributionsCollection: {
        totalCommitContributions: number;
        totalPullRequestContributions: number;
        totalPullRequestReviewContributions: number;
        totalIssueContributions: number;
      };
      pullRequests: {
        totalCount: number;
      };
      issueComments: {
        totalCount: number;
      };
    };
  };
  errors?: { message: string }[];
}

export async function fetchStatsGraphQL(
  username: string,
  since: string,
  until: string,
): Promise<ContributionStats> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    // Fallback to REST API if no token
    return fetchStatsREST(username, since);
  }

  try {
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalIssueContributions
          }
          pullRequests(states: MERGED, first: 0, orderBy: {field: CREATED_AT, direction: DESC}) {
            totalCount
          }
          issueComments(first: 0) {
            totalCount
          }
        }
      }
    `;

    // GraphQL contributionsCollection requires dates within the last year
    // and `from` must be at a day boundary in UTC
    const fromDate = new Date(since);
    const toDate = new Date(until);
    const now = new Date();
    // Clamp `to` to now if in the future
    const effectiveTo = toDate > now ? now : toDate;

    const res = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          username,
          from: fromDate.toISOString(),
          to: effectiveTo.toISOString(),
        },
      }),
    });

    if (!res.ok) {
      console.error(`GraphQL request failed: ${res.status}`);
      return fetchStatsREST(username, since);
    }

    const json: GraphQLContributionsResponse = await res.json();

    if (json.errors || !json.data?.user) {
      console.error('GraphQL errors:', json.errors);
      return fetchStatsREST(username, since);
    }

    const contrib = json.data.user.contributionsCollection;

    // For merged PRs and comments, the contributionsCollection doesn't
    // break them out individually, so we estimate from the totals.
    // The PR contributions count includes opened PRs; merged PRs are
    // a subset. We'll use the REST API to get a more precise count
    // for comments since GraphQL issueComments is lifetime total.
    const restStats = await fetchCommentsAndMergedPRs(username, since, token);

    return {
      commits: contrib.totalCommitContributions,
      pullRequests: contrib.totalPullRequestContributions,
      pullRequestsMerged: restStats.mergedPRs,
      issues: contrib.totalIssueContributions,
      reviews: contrib.totalPullRequestReviewContributions,
      comments: restStats.comments,
    };
  } catch (err) {
    console.error('GraphQL fetch failed:', err);
    return fetchStatsREST(username, since);
  }
}

// Fetch merged PRs count and comments from REST Events API (supplemental)
async function fetchCommentsAndMergedPRs(
  username: string,
  since: string,
  token: string,
): Promise<{ mergedPRs: number; comments: number }> {
  let mergedPRs = 0;
  let comments = 0;
  const sinceDate = new Date(since).getTime();

  try {
    let page = 1;
    let done = false;
    while (!done && page <= 3) {
      const res = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
          },
        },
      );
      if (!res.ok) break;
      const events = await res.json();
      if (events.length === 0) break;

      for (const event of events) {
        if (new Date(event.created_at).getTime() < sinceDate) {
          done = true;
          break;
        }
        if (event.type === 'PullRequestEvent' && event.payload?.pull_request?.merged) {
          mergedPRs++;
        }
        if (['IssueCommentEvent', 'CommitCommentEvent', 'PullRequestReviewCommentEvent'].includes(event.type)) {
          comments++;
        }
      }
      page++;
    }
  } catch { /* partial */ }

  return { mergedPRs, comments };
}

// Fallback: REST Events API (no auth needed, public repos only)
async function fetchStatsREST(
  username: string,
  since: string,
): Promise<ContributionStats> {
  const stats: ContributionStats = {
    commits: 0,
    pullRequests: 0,
    pullRequestsMerged: 0,
    issues: 0,
    reviews: 0,
    comments: 0,
  };

  try {
    const sinceDate = new Date(since).getTime();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `token ${token}`;

    let page = 1;
    let done = false;
    while (!done && page <= 3) {
      const res = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
        { headers },
      );
      if (!res.ok) break;
      const events = await res.json();
      if (events.length === 0) break;

      for (const event of events) {
        if (new Date(event.created_at).getTime() < sinceDate) {
          done = true;
          break;
        }
        switch (event.type) {
          case 'PushEvent':
            stats.commits += event.payload?.commits?.length || event.payload?.size || 1;
            break;
          case 'PullRequestEvent':
            if (event.payload?.action === 'opened') stats.pullRequests++;
            if (event.payload?.pull_request?.merged) stats.pullRequestsMerged++;
            break;
          case 'IssuesEvent':
            if (event.payload?.action === 'opened') stats.issues++;
            break;
          case 'PullRequestReviewEvent':
            stats.reviews++;
            break;
          case 'IssueCommentEvent':
          case 'CommitCommentEvent':
          case 'PullRequestReviewCommentEvent':
            stats.comments++;
            break;
        }
      }
      page++;
    }
  } catch { /* partial */ }

  return stats;
}
