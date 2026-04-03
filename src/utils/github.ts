import type { ParticipantStats } from '../types';

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: {
    action?: string;
    pull_request?: { merged?: boolean };
    size?: number;
    commits?: unknown[];
  };
}

export async function fetchGitHubEvents(
  username: string,
  since: string,
): Promise<ParticipantStats> {
  const stats: ParticipantStats = {
    commits: 0,
    pullRequests: 0,
    pullRequestsMerged: 0,
    issues: 0,
    reviews: 0,
    comments: 0,
  };

  try {
    // GitHub Events API returns up to 10 pages of 30 events (max 300)
    const sinceDate = new Date(since).getTime();
    let page = 1;
    let done = false;

    while (!done && page <= 3) {
      const res = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        },
      );

      if (!res.ok) break;

      const events: GitHubEvent[] = await res.json();
      if (events.length === 0) break;

      for (const event of events) {
        const eventTime = new Date(event.created_at).getTime();
        if (eventTime < sinceDate) {
          done = true;
          break;
        }

        switch (event.type) {
          case 'PushEvent':
            stats.commits += event.payload?.commits?.length || event.payload?.size || 1;
            break;
          case 'PullRequestEvent':
            if (event.payload?.action === 'opened') {
              stats.pullRequests++;
            }
            if (event.payload?.pull_request?.merged) {
              stats.pullRequestsMerged++;
            }
            break;
          case 'IssuesEvent':
            if (event.payload?.action === 'opened') {
              stats.issues++;
            }
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
  } catch {
    // Return partial stats on error
  }

  return stats;
}

export async function validateGitHubUser(
  username: string,
): Promise<{ valid: boolean; avatarUrl: string }> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return { valid: false, avatarUrl: '' };
    const data = await res.json();
    return { valid: true, avatarUrl: data.avatar_url };
  } catch {
    return { valid: false, avatarUrl: '' };
  }
}
