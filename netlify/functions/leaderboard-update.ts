import type { StoredBattle } from './store.js';
import { getPlayerRecord, savePlayerRecord, createEmptyRecord, type StoredPlayerRecord } from './leaderboard-store.js';

type BadgeId =
  | 'first_blood' | 'champion' | 'underdog' | 'on_fire' | 'dominator'
  | 'flawless' | 'challenger' | 'social_butterfly' | 'committer'
  | 'pr_machine' | 'reviewer' | 'sniper' | 'arena_master';

interface BattleContext {
  battle: StoredBattle;
  playerScore: number;
  playerWon: boolean;
  isDraw: boolean;
  winnerScore: number;
  secondPlaceScore: number;
  allOpponentScores: number[];
  opponentUsernames: string[];
  totalParticipants: number;
  wasEverLosing: boolean;
  hadFewerVotes: boolean;
  wasWaitingBattle: boolean;
  winMargin: number;
}

const BADGE_EVALUATORS: Record<BadgeId, (record: StoredPlayerRecord, ctx: BattleContext) => boolean> = {
  first_blood: (r) => r.wins >= 1,
  champion: (r) => r.wins >= 10,
  on_fire: (r) => r.currentWinStreak >= 3,
  social_butterfly: (r) => r.battlesPlayed >= 10,
  committer: (r) => r.totalCommits >= 1000,
  pr_machine: (r) => r.totalPRs >= 100,
  reviewer: (r) => r.totalReviews >= 50,
  arena_master: (r) => r.battlesCreated >= 10,
  dominator: (_, ctx) => ctx.playerWon && ctx.totalParticipants >= 2 &&
    ctx.winnerScore > 0 && (ctx.playerScore / (ctx.playerScore + ctx.allOpponentScores.reduce((a, b) => a + b, 0))) >= 0.9,
  flawless: (_, ctx) => ctx.playerWon && ctx.totalParticipants >= 2 &&
    ctx.allOpponentScores.every(s => s === 0) && ctx.playerScore > 0,
  underdog: (_, ctx) => ctx.playerWon && ctx.hadFewerVotes,
  challenger: (_, ctx) => ctx.playerWon && ctx.wasWaitingBattle,
  sniper: (_, ctx) => ctx.playerWon && ctx.totalParticipants >= 2 && ctx.winMargin === 1,
};

function evaluateNewBadges(record: StoredPlayerRecord, ctx: BattleContext): BadgeId[] {
  const alreadyEarned = new Set(record.badges.map(b => b.badgeId));
  const newBadges: BadgeId[] = [];
  for (const [id, evaluator] of Object.entries(BADGE_EVALUATORS)) {
    if (!alreadyEarned.has(id) && evaluator(record, ctx)) {
      newBadges.push(id as BadgeId);
    }
  }
  return newBadges;
}

/**
 * Called once when a battle transitions to 'finished'.
 * Updates all participants' leaderboard records and evaluates badges.
 * Returns a map of username -> newly earned badge IDs.
 */
export async function onBattleFinished(battle: StoredBattle): Promise<Record<string, string[]>> {
  const participants = battle.participants;
  if (participants.length < 2) return {};

  // Determine standings
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const winnerScore = sorted[0].score;
  const secondPlaceScore = sorted.length > 1 ? sorted[1].score : 0;
  const isDraw = sorted.length > 1 && sorted[0].score === sorted[1].score;
  const winners = isDraw ? [] : sorted.filter(p => p.score === winnerScore);
  const winnerUsernames = new Set(winners.map(w => w.username));

  // Check scoreHistory for "was ever losing" per player
  const wasEverLosing: Record<string, boolean> = {};
  if (battle.scoreHistory && battle.scoreHistory.length > 1) {
    for (const winner of winners) {
      wasEverLosing[winner.username] = battle.scoreHistory.some(snap => {
        const myScore = snap.scores[winner.username] ?? 0;
        return Object.entries(snap.scores).some(
          ([u, s]) => u !== winner.username && s > myScore,
        );
      });
    }
  }

  const newBadgesMap: Record<string, string[]> = {};

  for (const p of participants) {
    let record = await getPlayerRecord(p.username);
    if (!record) {
      record = createEmptyRecord(p.username, p.avatarUrl);
    }

    // Idempotency: skip if already processed this battle
    if (record.battleHistory.some(h => h.battleId === battle.id)) continue;

    // Update avatar (may have changed)
    record.avatarUrl = p.avatarUrl;

    const playerWon = winnerUsernames.has(p.username);

    // Update cumulative stats
    record.battlesPlayed += 1;
    record.totalScore += p.score;
    if (p.score > record.highestScore) record.highestScore = p.score;
    record.totalCommits += p.stats.commits;
    record.totalPRs += p.stats.pullRequests + p.stats.pullRequestsMerged;
    record.totalReviews += p.stats.reviews;

    if (isDraw) {
      record.draws += 1;
      record.currentWinStreak = 0;
    } else if (playerWon) {
      record.wins += 1;
      record.currentWinStreak += 1;
      if (record.currentWinStreak > record.longestWinStreak) {
        record.longestWinStreak = record.currentWinStreak;
      }
    } else {
      record.losses += 1;
      record.currentWinStreak = 0;
    }

    // Track battlesCreated
    if (battle.createdBy === p.username) {
      record.battlesCreated += 1;
    }

    // Track unique opponents
    const opponents = participants.filter(x => x.username !== p.username).map(x => x.username);
    for (const opp of opponents) {
      if (!record.uniqueOpponents.includes(opp)) {
        record.uniqueOpponents.push(opp);
      }
    }

    // Add to battle history
    record.battleHistory.push({
      battleId: battle.id,
      date: battle.endDate,
      score: p.score,
      won: playerWon,
      opponentCount: participants.length - 1,
    });

    // Build battle context for badge evaluation
    const opponentScores = participants.filter(x => x.username !== p.username).map(x => x.score);
    const playerVotes = battle.votes[p.username] || 0;
    const maxOpponentVotes = Math.max(0, ...opponents.map(u => battle.votes[u] || 0));

    const ctx: BattleContext = {
      battle,
      playerScore: p.score,
      playerWon,
      isDraw,
      winnerScore,
      secondPlaceScore,
      allOpponentScores: opponentScores,
      opponentUsernames: opponents,
      totalParticipants: participants.length,
      wasEverLosing: wasEverLosing[p.username] || false,
      hadFewerVotes: playerVotes < maxOpponentVotes,
      wasWaitingBattle: participants.length === 2, // simplified: 1v1 battles
      winMargin: playerWon ? p.score - secondPlaceScore : 0,
    };

    // Evaluate badges
    const newBadges = evaluateNewBadges(record, ctx);
    const now = new Date().toISOString();
    for (const badgeId of newBadges) {
      record.badges.push({ badgeId, earnedAt: now, battleId: battle.id });
    }

    if (newBadges.length > 0) {
      newBadgesMap[p.username] = newBadges;
    }

    record.lastUpdated = now;
    await savePlayerRecord(record);
  }

  return newBadgesMap;
}
