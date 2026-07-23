export type ScoreKey =
	| 'defensive'
	| 'passing'
	| 'possession'
	| 'attacking'
	| 'finishing'
	| 'keeper'
	| 'total';

export const SCORE_CONFIG: Record<ScoreKey, { label: string; color: string }> = {
	defensive: { label: 'Defensive', color: '#2563eb' },
	passing: { label: 'Passing', color: '#16a34a' },
	possession: { label: 'Possession', color: '#9333ea' },
	attacking: { label: 'Attacking', color: '#ea580c' },
	finishing: { label: 'Finishing', color: '#e11d48' },
	keeper: { label: 'Keeper', color: '#0891b2' },
	total: { label: 'Total', color: '#475569' }
};

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