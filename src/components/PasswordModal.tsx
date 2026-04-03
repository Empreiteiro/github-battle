import { useState } from 'react';

interface Props {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export default function PasswordModal({ onSubmit, onCancel, error }: Props) {
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="pixel-border bg-dark-card p-6 rounded-lg max-w-sm w-full">
        <h3 className="pixel-font text-xs text-accent-yellow mb-4 text-center">
          &#128274; PRIVATE ROOM
        </h3>
        <p className="text-sm text-dark-muted mb-4 text-center">
          Enter the password to join as a competitor
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password..."
          className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded mb-2 focus:border-accent-purple outline-none"
          onKeyDown={e => e.key === 'Enter' && onSubmit(password)}
        />
        {error && (
          <p className="text-accent-red text-xs mb-2">{error}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 pixel-font text-[10px] bg-dark-bg text-dark-muted border border-dark-border px-3 py-2 rounded hover:bg-dark-border/50 transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={() => onSubmit(password)}
            className="flex-1 pixel-font text-[10px] bg-accent-purple/20 text-accent-purple border border-accent-purple/50 px-3 py-2 rounded hover:bg-accent-purple/30 transition-colors cursor-pointer"
          >
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
}
