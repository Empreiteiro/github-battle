import type { Participant, ScoringConfig, ScoringKey, Team } from '../types';
import { DEFAULT_SCORING, SCORING_LABELS } from '../types';
import { teamClasses } from '../utils/teamColors';
import GitHubAvatar from './GitHubAvatar';

interface Props {
  participants: Participant[];
  scoring?: ScoringConfig;
  teams?: Team[];
}

const STAT_MAP: Record<ScoringKey, keyof Participant['stats']> = {
  commit: 'commits',
  pr: 'pullRequests',
  pr_merged: 'pullRequestsMerged',
  issue: 'issues',
  review: 'reviews',
  comment: 'comments',
};

export default function ParticipantList({ participants, scoring, teams }: Props) {
  const sc = scoring || DEFAULT_SCORING;
  const activeKeys = (Object.keys(STAT_MAP) as ScoringKey[]).filter(k => sc.enabled[k]);

  // Team mode: render team groups in ranked order (highest team total first).
  if (teams && teams.length >= 2) {
    const participantByName = new Map(participants.map(p => [p.username, p]));
    const teamRows = teams.map(team => {
      const members = team.members
        .map(m => participantByName.get(m))
        .filter((p): p is Participant => !!p)
        .sort((a, b) => b.score - a.score);
      const total = members.reduce((sum, m) => sum + m.score, 0);
      return { team, members, total };
    }).sort((a, b) => b.total - a.total);

    const matchup = teamRows.map(r => r.members.length).join(' vs ');

    return (
      <div className="pixel-border bg-dark-card p-4 rounded-lg flex-1">
        <h3 className="pixel-font text-xs text-accent-blue mb-1 text-center">
          &#128101; TEAM SCOREBOARD
        </h3>
        {matchup && (
          <p className="pixel-font text-[10px] text-dark-muted text-center mb-4">{matchup}</p>
        )}

        <div className="space-y-4">
          {teamRows.map(({ team, members, total }, teamIdx) => {
            const c = teamClasses(team.color);
            return (
              <div key={team.id} className={`rounded-lg border ${c.softBorder} bg-dark-bg/40 p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="pixel-font text-[10px] text-accent-yellow">#{teamIdx + 1}</span>
                    <span className={`pixel-font text-xs ${c.text}`}>{team.name}</span>
                    <span className="text-[10px] text-dark-muted">({members.length})</span>
                  </div>
                  <span className={`pixel-font text-sm ${c.text}`}>{total}</span>
                </div>

                <div className="space-y-2">
                  {members.map(p => (
                    <div key={p.username} className="bg-dark-bg/50 p-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} />
                          <a href={`https://github.com/${p.username}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-dark-text hover:text-accent-blue transition-colors no-underline">{p.username}</a>
                        </div>
                        <span className="pixel-font text-xs text-accent-green">{p.score}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        {activeKeys.map(key => (
                          <StatItem
                            key={key}
                            label={SCORING_LABELS[key]}
                            value={p.stats[STAT_MAP[key]]}
                            points={sc.points[key]}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-[10px] text-dark-muted text-center py-2">No members yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Individual mode (original layout)
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg flex-1">
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
                <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} />
                <a href={`https://github.com/${p.username}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-dark-text hover:text-accent-blue transition-colors no-underline">{p.username}</a>
              </div>
              <span className="pixel-font text-sm text-accent-green">
                {p.score}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {activeKeys.map(key => (
                <StatItem
                  key={key}
                  label={SCORING_LABELS[key]}
                  value={p.stats[STAT_MAP[key]]}
                  points={sc.points[key]}
                />
              ))}
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
