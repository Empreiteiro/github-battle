// GitHub GraphQL API client for fetching contribution data
// Uses GITHUB_TOKEN env var for authenticated requests
// contributionCalendar.totalContributions includes private repo activity
// visible on the user's profile (restricted contributions)

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

interface ContributionStats {
  commits: number;
  pullRequests: number;
  pullRequestsMerged: number;
  issues: number;
  reviews: number;
  comments: number;
}

export async function fetchStatsGraphQL(
  username: string,
  since: string,
  until: string,
  repos?: string[],
): Promise<ContributionStats> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return fetchStatsREST(username, since, repos);
  }

  // When filtering by specific repos, GraphQL contributionsCollection
  // doesn't support per-repo breakdown — use REST Events API instead
  if (repos && repos.length > 0) {
    return fetchStatsREST(username, since, repos);
  }

  try {
    const fromDate = new Date(since);
    const toDate = new Date(until);
    const now = new Date();
    const effectiveTo = toDate > now ? now : toDate;

    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalIssueContributions
            restrictedContributionsCount
            contributionCalendar {
              totalContributions
            }
          }
        }
      }
    `;

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
      return fetchStatsREST(username, since, repos);
    }

    const json = await res.json();

    if (json.errors || !json.data?.user) {
      console.error('GraphQL errors:', json.errors);
      return fetchStatsREST(username, since, repos);
    }

    const contrib = json.data.user.contributionsCollection;
    const publicTotal =
      contrib.totalCommitContributions +
      contrib.totalPullRequestContributions +
      contrib.totalPullRequestReviewContributions +
      contrib.totalIssueContributions;
    const restrictedCount: number = contrib.restrictedContributionsCount || 0;
    const calendarTotal: number = contrib.contributionCalendar.totalContributions || 0;

    // If user has restricted (private) contributions, the typed breakdown
    // only covers public activity. We attribute the restricted count as
    // commits since we can't know the actual breakdown.
    // The calendar total = public typed contributions + restricted count.
    const privateCommits = restrictedCount > 0 ? restrictedCount : Math.max(0, calendarTotal - publicTotal);

    // Get comments and merged PRs from REST Events API (supplemental)
    const restExtra = await fetchCommentsAndMergedPRs(username, since, token);

    return {
      commits: contrib.totalCommitContributions + privateCommits,
      pullRequests: contrib.totalPullRequestContributions,
      pullRequestsMerged: restExtra.mergedPRs,
      issues: contrib.totalIssueContributions,
      reviews: contrib.totalPullRequestReviewContributions,
      comments: restExtra.comments,
    };
  } catch (err) {
    console.error('GraphQL fetch failed:', err);
    return fetchStatsREST(username, since, repos);
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

// Fallback: REST Events API with optional repo filtering
async function fetchStatsREST(
  username: string,
  since: string,
  repos?: string[],
): Promise<ContributionStats> {
  const repoSet = repos && repos.length > 0 ? new Set(repos.map(r => r.toLowerCase())) : null;
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
        // Skip events not in the allowed repos
        if (repoSet && event.repo?.name && !repoSet.has(event.repo.name.toLowerCase())) {
          continue;
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
