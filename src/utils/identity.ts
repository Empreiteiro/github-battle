// Persistent browser identity for non-logged-in users.
// Generates a random ID on first visit and stores it in localStorage.

const BROWSER_ID_KEY = 'github-battle-browser-id';

function generateBrowserId(): string {
  return 'b_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

export function getBrowserId(): string {
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = generateBrowserId();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

// Returns the creator identifier: GitHub username if logged in, otherwise browser ID
export function getCreatorId(): string {
  try {
    const auth = localStorage.getItem('github-battle-auth');
    if (auth) {
      const user = JSON.parse(auth);
      if (user.username) return user.username;
    }
  } catch { /* fallback to browser ID */ }
  return getBrowserId();
}

// Hardcoded moderators — can delete any battle
const MODERATORS = ['Empreiteiro'];

export function isModerator(): boolean {
  try {
    const auth = localStorage.getItem('github-battle-auth');
    if (auth) {
      const user = JSON.parse(auth);
      if (user.username && MODERATORS.includes(user.username)) return true;
    }
  } catch { /* not a moderator */ }
  return false;
}

// Check if the current user can manage a battle (creator or moderator)
export function canManageBattle(creatorId: string | undefined): boolean {
  if (isModerator()) return true;
  return isCreator(creatorId);
}

// Check if the current user (logged in or browser) matches a creator ID
export function isCreator(creatorId: string | undefined): boolean {
  if (!creatorId) return false;
  // Match by GitHub username if logged in
  try {
    const auth = localStorage.getItem('github-battle-auth');
    if (auth) {
      const user = JSON.parse(auth);
      if (user.username && user.username === creatorId) return true;
    }
  } catch { /* continue */ }
  // Match by browser ID
  const browserId = localStorage.getItem(BROWSER_ID_KEY);
  return browserId === creatorId;
}
