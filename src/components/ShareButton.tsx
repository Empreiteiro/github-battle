import { useState } from 'react';
import type { Battle } from '../types';

interface Props {
  battle: Battle;
}

export default function ShareButton({ battle }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const url = window.location.href;
  const title = `GitHub Battle: ${battle.name}`;
  const participants = battle.participants.map(p => p.username).join(' vs ');
  const leader = [...battle.participants].sort((a, b) => b.score - a.score)[0];
  const description = battle.status === 'finished'
    ? `${leader?.username} won! ${participants}`
    : `${participants} — ${battle.participants.length} fighters competing!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`${title}\n${description}`);
    const shareUrl = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank', 'width=550,height=420');
  };

  const shareLinkedIn = () => {
    const shareUrl = encodeURIComponent(url);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank', 'width=550,height=550');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full pixel-font text-[10px] bg-dark-bg text-dark-muted border border-dark-border py-2 rounded hover:bg-dark-border/50 hover:text-dark-text transition-colors cursor-pointer text-center"
      >
        SHARE
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 pixel-border bg-dark-card p-3 rounded-lg w-64 space-y-2">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-dark-text hover:bg-dark-bg transition-colors cursor-pointer text-left"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25z"/>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25z"/>
              </svg>
              {copied ? <span className="text-accent-green">Copied!</span> : 'Copy link'}
            </button>

            <button
              onClick={shareTwitter}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-dark-text hover:bg-dark-bg transition-colors cursor-pointer text-left"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </button>

            <button
              onClick={shareLinkedIn}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-dark-text hover:bg-dark-bg transition-colors cursor-pointer text-left"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Share on LinkedIn
            </button>
          </div>
        </>
      )}
    </div>
  );
}
