// Server-side GitHub token verification.
// Calls GitHub API to get the real username from an OAuth token.
// Never trust the client-provided username — always verify.

export async function verifyGitHubToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;

  const token = authHeader.replace(/^bearer\s+/i, '').replace(/^token\s+/i, '').trim();
  if (!token) return null;

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.login || null;
  } catch {
    return null;
  }
}

export const MODERATORS = ['Empreiteiro'];

export function isModerator(username: string): boolean {
  return MODERATORS.includes(username);
}
