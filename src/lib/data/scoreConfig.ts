export type ScoreKey =
	| 'defensive'
	| 'passing'
	| 'possession'
	| 'attacking'
	| 'finishing'
	| 'keeper'
	| 'total';

export const SCORE_CONFIG: Record<ScoreKey, { label: string; abbrev: string; color: string }> = {
    defensive:  { label: 'Defensive',  abbrev: 'DEF', color: '#e63946' },
    possession: { label: 'Possession', abbrev: 'POS', color: '#f4a261' },
    passing:    { label: 'Passing',    abbrev: 'PAS', color: '#2a9d8f' },
    attacking:  { label: 'Attacking',  abbrev: 'ATK', color: '#264653' },
    finishing:  { label: 'Finishing',  abbrev: 'FIN', color: '#b011e0' },
    keeper:     { label: 'Keeper',     abbrev: 'KEP', color: '#524ff3' },
    total:      { label: 'Total',      abbrev: 'TOT', color: '#475569' }
};

export function playerScores(p: any): Record<ScoreKey, number> {
    return {
        defensive:  p?.defensive_score  ?? 0,
        possession: p?.possession_score ?? 0,
        passing:    p?.passing_score    ?? 0,
        attacking:  p?.attacking_score  ?? 0,
        finishing:  p?.finishing_score  ?? 0,
        keeper:     p?.keeper_score     ?? 0,
        total:      p?.total_score      ?? 0
    };
}

export function normalizeTeamScores(
    scores: any,
    playerCount = 1,
    keeperCount = 1
): Record<ScoreKey, number> {
    const outfield = Math.max(1, playerCount || 1);
    const keepers = Math.max(1, keeperCount || 1);
    const t = scores ?? {};
    return {
        defensive:  (t.defense    ?? 0) / outfield,
        possession: (t.possession ?? 0) / outfield,
        passing:    (t.passing    ?? 0) / outfield,
        attacking:  (t.attacking  ?? 0) / outfield,
        finishing:  (t.finishing  ?? 0) / outfield,
        keeper:     (t.keeping    ?? 0) / keepers,
        total:      0
    };
}

export function teamScores(team: any): Record<ScoreKey, number> {
    return normalizeTeamScores(team?.scores?.total, team?.playerCount, team?.keepers?.length);
}

export const TEAM_SCORE_KEYS: ScoreKey[] = [
	'keeper',
    'defensive',
	'passing',
	'possession',
	'attacking',
	'finishing'
];

/** Display order — mirrors the slug page's score bars. */
export const OUTFIELD_SCORE_KEYS: ScoreKey[] = [
	'defensive',
	'passing',
	'possession',
	'attacking',
	'finishing'
];

export const KEEPER_SCORE_KEYS: ScoreKey[] = ['keeper', 'passing'];

export const MAX_SCORE = 5000;

/** Team-vs-opponent bar colors (used by compare mode). */
export const TEAM_COLOR = '#3b82f6';
export const OPPONENT_COLOR = '#ef4444';
export const TIE_COLOR = '#9ca3af';

// The codebase has historically used two names for the same two scores.
// Normalize both spellings so a mismatch can't silently render 0.
const KEY_ALIASES: Record<string, ScoreKey> = {
	defense: 'defensive',
	defence: 'defensive',
	defensive_score: 'defensive',
	keeping: 'keeper',
	keepers: 'keeper',
	keeper_score: 'keeper',
	passing_score: 'passing',
	possession_score: 'possession',
	attacking_score: 'attacking',
	finishing_score: 'finishing',
	total_score: 'total'
};

export function normalizeScoreKey(key: string): string {
	return KEY_ALIASES[key] ?? key;
}

/** Re-key an arbitrary score object onto canonical keys. */
export function normalizeScores(scores: Record<string, any> | null | undefined): Record<string, number> {
	const out: Record<string, number> = {};
	if (!scores) return out;
	for (const [k, v] of Object.entries(scores)) {
		out[normalizeScoreKey(k)] = Number(v) || 0;
	}
	return out;
}

/** Which score keys to show for a group/position. */
export function scoreKeysFor(isKeeper: boolean): ScoreKey[] {
	return isKeeper ? KEEPER_SCORE_KEYS : OUTFIELD_SCORE_KEYS;
}