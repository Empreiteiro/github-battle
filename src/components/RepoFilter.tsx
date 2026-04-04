import { useState, useRef, useEffect } from 'react';

interface Props {
  repos: string[];
  onChange: (repos: string[]) => void;
}

interface RepoSuggestion {
  full_name: string;
  description: string | null;
}

export default function RepoFilter({ repos, onChange }: Props) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchRepos = (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=8`,
          { headers: { Accept: 'application/vnd.github.v3+json' } },
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(
            (data.items || []).map((r: { full_name: string; description: string | null }) => ({
              full_name: r.full_name,
              description: r.description,
            })),
          );
          setShowDropdown(true);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
  };

  const addRepo = (repoName: string) => {
    const normalized = repoName.trim();
    if (normalized && !repos.includes(normalized)) {
      onChange([...repos, normalized]);
    }
    setInput('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const removeRepo = (repoName: string) => {
    onChange(repos.filter(r => r !== repoName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addRepo(input);
    }
  };

  return (
    <div ref={containerRef}>
      {/* Chips */}
      {repos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {repos.map(repo => (
            <span
              key={repo}
              className="inline-flex items-center gap-1 bg-accent-blue/15 text-accent-blue text-xs px-2 py-1 rounded border border-accent-blue/30"
            >
              {repo}
              <button
                type="button"
                onClick={() => removeRepo(repo)}
                className="hover:text-accent-red transition-colors cursor-pointer ml-1"
              >
                &#10005;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); searchRepos(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search repos... (e.g., facebook/react)"
          className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-blue outline-none text-sm"
        />
        {loading && (
          <span className="absolute right-2 top-2 text-dark-muted text-xs animate-pulse">...</span>
        )}

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-dark-card border border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s.full_name}
                type="button"
                onClick={() => addRepo(s.full_name)}
                className="w-full text-left px-3 py-2 hover:bg-dark-bg transition-colors cursor-pointer border-b border-dark-border/50 last:border-b-0"
              >
                <span className="text-sm text-accent-blue">{s.full_name}</span>
                {s.description && (
                  <span className="block text-[10px] text-dark-muted truncate">{s.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
