import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface GitHubUser {
  username: string;
  avatarUrl: string;
  name: string | null;
}

interface AuthContextType {
  user: GitHubUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = 'github-battle-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Handle OAuth callback — check URL for ?auth_token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    if (!token) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    // Fetch user info with the token
    (async () => {
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const ghUser: GitHubUser = {
            username: data.login,
            avatarUrl: data.avatar_url,
            name: data.name,
          };
          setUser(ghUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ghUser));
          // Also store the token for authenticated API calls
          localStorage.setItem('github-battle-token', token);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const login = useCallback(() => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('VITE_GITHUB_CLIENT_ID not set');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth-callback`;
    const scope = 'read:user';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('github-battle-token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
