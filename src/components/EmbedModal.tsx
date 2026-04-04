import { useState } from 'react';

interface Props {
  battleId: string;
  onClose: () => void;
}

export default function EmbedModal({ battleId, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = window.location.origin;
  const embedUrl = `${origin}/embed/${battleId}`;
  const battleUrl = `${origin}/battle/${battleId}`;

  const snippets = [
    {
      label: 'HTML (iframe)',
      code: `<iframe src="${embedUrl}" width="100%" height="280" frameborder="0" style="border-radius:8px;border:1px solid #30363d;"></iframe>`,
    },
    {
      label: 'Markdown (for READMEs)',
      code: `[![GitHub Battle](${origin}/api/og-image?title=Battle&status=Live)](${battleUrl})`,
    },
    {
      label: 'Direct link',
      code: embedUrl,
    },
  ];

  const handleCopy = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="pixel-border bg-dark-card p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="pixel-font text-xs text-accent-blue">EMBED BATTLE</h3>
          <button
            onClick={onClose}
            className="text-dark-muted hover:text-dark-text cursor-pointer"
          >
            &#10005;
          </button>
        </div>

        {/* Preview */}
        <div className="mb-4 rounded overflow-hidden border border-dark-border">
          <iframe
            src={embedUrl}
            width="100%"
            height="240"
            style={{ border: 'none', display: 'block' }}
            title="Battle embed preview"
          />
        </div>

        {/* Snippets */}
        <div className="space-y-4">
          {snippets.map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="pixel-font text-[10px] text-dark-muted">{s.label}</span>
                <button
                  onClick={() => handleCopy(s.code, s.label)}
                  className="pixel-font text-[8px] text-accent-green hover:bg-accent-green/10 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  {copied === s.label ? 'COPIED!' : 'COPY'}
                </button>
              </div>
              <pre className="bg-dark-bg p-2 rounded text-[11px] text-dark-text overflow-x-auto whitespace-pre-wrap break-all border border-dark-border">
                {s.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
