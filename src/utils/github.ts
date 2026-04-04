import type { ParticipantStats, HeatmapData } from '../types';

interface GitHubEvent {
  type: string;
  created_at: string;
  repo?: { name?: string };
  payload?: {
    action?: string;
    pull_request?: { merged?: boolean };
    size?: number;
    commits?: unknown[];
  };
}

export interface FetchResult {
  stats: ParticipantStats;
  heatmap: HeatmapData;
}

function emptyHeatmap(): HeatmapData {
  return Array.from({ length: 7 }, () => Array(24).fill(0));
}

export async function fetchGitHubEvents(
  username: string,
  since: string,
  repos?: string[],
): Promise<FetchResult> {
  const repoSet = repos && repos.length > 0 ? new Set(repos.map(r => r.toLowerCase())) : null;
  const stats: ParticipantStats = {
    commits: 0,
    pullRequests: 0,
    pullRequestsMerged: 0,
    issues: 0,
    reviews: 0,
    comments: 0,
  };
  const heatmap = emptyHeatmap();

  try {
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
        const eventDate = new Date(event.created_at);
        if (eventDate.getTime() < sinceDate) {
          done = true;
          break;
        }

        // Skip events not in the allowed repos
        if (repoSet && event.repo?.name && !repoSet.has(event.repo.name.toLowerCase())) {
          continue;
        }

        // Bucket into heatmap
        const day = eventDate.getDay(); // 0=Sun
        const hour = eventDate.getHours();

        let counted = false;
        switch (event.type) {
          case 'PushEvent':
            stats.commits += event.payload?.commits?.length || event.payload?.size || 1;
            counted = true;
            break;
          case 'PullRequestEvent':
            if (event.payload?.action === 'opened') {
              stats.pullRequests++;
              counted = true;
            }
            if (event.payload?.pull_request?.merged) {
              stats.pullRequestsMerged++;
              counted = true;
            }
            break;
          case 'IssuesEvent':
            if (event.payload?.action === 'opened') {
              stats.issues++;
              counted = true;
            }
            break;
          case 'PullRequestReviewEvent':
            stats.reviews++;
            counted = true;
            break;
          case 'IssueCommentEvent':
          case 'CommitCommentEvent':
          case 'PullRequestReviewCommentEvent':
            stats.comments++;
            counted = true;
            break;
        }

        if (counted) {
          heatmap[day][hour]++;
        }
      }

      page++;
    }
  } catch {
    // Return partial stats on error
  }

  return { stats, heatmap };
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
