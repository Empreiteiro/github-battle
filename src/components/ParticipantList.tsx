import type { Participant } from '../types';
import { SCORING } from '../types';

interface Props {
  participants: Participant[];
}

export default function ParticipantList({ participants }: Props) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg">
      <h3 className="pixel-font text-xs text-accent-blue mb-4 text-center">
        &#128200; SCOREBOARD
      </h3>

      <div className="space-y-3">
        {sorted.map((p, i) => (
          <div key={p.username} className="bg-dark-bg/50 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="pixel-font text-[10px] text-accent-yellow">
                  #{i + 1}
                </span>
                <img src={p.avatarUrl} alt={p.username} className="w-8 h-8 rounded-full" />
                <span className="text-sm font-bold text-dark-text">{p.username}</span>
              </div>
              <span className="pixel-font text-sm text-accent-green">
                {p.score}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <StatItem label="Commits" value={p.stats.commits} points={SCORING.commit} />
              <StatItem label="PRs" value={p.stats.pullRequests} points={SCORING.pr} />
              <StatItem label="Merged" value={p.stats.pullRequestsMerged} points={SCORING.pr_merged} />
              <StatItem label="Issues" value={p.stats.issues} points={SCORING.issue} />
              <StatItem label="Reviews" value={p.stats.reviews} points={SCORING.review} />
              <StatItem label="Comments" value={p.stats.comments} points={SCORING.comment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatItem({ label, value, points }: { label: string; value: number; points: number }) {
  return (
    <div className="flex justify-between text-dark-muted">
      <span>{label}</span>
      <span className="text-dark-text">
        {value} <span className="text-accent-green text-[8px]">(+{value * points})</span>
      </span>
    </div>
  );
}
