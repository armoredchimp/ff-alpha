// $lib/utils/matchStats.ts
// Domain logic for per-match stat display. Pure functions over a
// current_week_stats row + the player's detailed_position. Shared by the
// fixture component and (later) the post-match screen.

import {
	MATCH_TO_WEIGHT_KEY,
	STAT_CATEGORIES,
	KEEPER_ALWAYS_SHOW,
	FALLBACK_STAT_ORDER,
	TOP_STAT_LIMIT,
	STATS_ROW_METADATA
} from '$lib/data/matchStatWeighing';
import { IMP_MAPS } from '$lib/stores/generic.svelte';

export interface MatchStat {
	/** current_week_stats column key, e.g. "big_chances_created" */
	col: string;
	/** display label, e.g. "Big Chances Created" */
	label: string;
	/** raw match value, or null when absent (fallback rows can be null) */
	value: number | null;
	/** true for keeper always-shown / fallback rows that bypassed ranking */
	filler?: boolean;
}

const KEEPER_POSITION = 'Goalkeeper';

// big_chances_created -> "Big Chances Created". Simple word-split + title-case.
// A few reads slightly off (yellowred_cards) — targeted overrides can come later.
export function humanizeStatKey(col: string): string {
	return col
		.split('_')
		.map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
		.join(' ');
}

function importanceFor(weightKey: string, detailedPosition: string): number {
	const cats = STAT_CATEGORIES[weightKey] ?? [];
	let importance = 0;
	for (const cat of cats) {
		const imp = IMP_MAPS[cat]?.[detailedPosition]?.[weightKey];
		if (imp != null) importance = Math.max(importance, Math.abs(imp));
	}
	return importance;
}

/**
 * The top-section stats for a match, already ordered for display.
 *
 * Outfield: up to TOP_STAT_LIMIT ranked stats (by positional importance),
 *   topped up from FALLBACK_STAT_ORDER when fewer than the limit have values.
 * Keeper: KEEPER_ALWAYS_SHOW first (shown regardless), then up to the remaining
 *   slots filled from ranked stats they earned. No outfield fallback list.
 */
export function rankMatchStats(
	row: Record<string, any> | null | undefined,
	detailedPosition: string
): MatchStat[] {
	if (!row) return [];
	const isKeeper = detailedPosition === KEEPER_POSITION;

	// Build the ranked pool from weighted stats that have a value this match.
	const ranked: { col: string; importance: number; value: number }[] = [];
	for (const [col, weightKey] of Object.entries(MATCH_TO_WEIGHT_KEY)) {
		const val = row[col];
		if (val == null) continue;
		ranked.push({ col, importance: importanceFor(weightKey, detailedPosition), value: val });
	}
	ranked.sort((a, b) => b.importance - a.importance);

	if (isKeeper) {
		const always: MatchStat[] = KEEPER_ALWAYS_SHOW.filter((col) => row[col] != null).map(
			(col) => ({ col, label: humanizeStatKey(col), value: row[col], filler: true })
		);
		const alwaysCols = new Set<string>(KEEPER_ALWAYS_SHOW);
		const remaining = TOP_STAT_LIMIT - always.length;
		const earned: MatchStat[] = ranked
			.filter((r) => !alwaysCols.has(r.col))
			.slice(0, Math.max(remaining, 0))
			.map((r) => ({ col: r.col, label: humanizeStatKey(r.col), value: r.value }));
		return [...always, ...earned];
	}

	// Outfield: ranked first, then fallback top-up to the limit.
	const out: MatchStat[] = ranked
		.slice(0, TOP_STAT_LIMIT)
		.map((r) => ({ col: r.col, label: humanizeStatKey(r.col), value: r.value }));

	if (out.length < TOP_STAT_LIMIT) {
		const used = new Set(out.map((s) => s.col));
		for (const col of FALLBACK_STAT_ORDER) {
			if (out.length >= TOP_STAT_LIMIT) break;
			if (used.has(col)) continue;
			used.add(col);
			// Fallbacks show even when null/zero — value null renders blank.
			const raw = row[col];
			out.push({
				col,
				label: humanizeStatKey(col),
				value: raw == null ? null : raw,
				filler: true
			});
		}
	}

	return out;
}

/**
 * Every non-null stat on the row for the expandable dropdown, metadata excluded.
 * Zeros are kept (0 is not null). Ordered by the row's own key order.
 */
export function dropdownMatchStats(row: Record<string, any> | null | undefined): MatchStat[] {
	if (!row) return [];
	const out: MatchStat[] = [];
	for (const [col, value] of Object.entries(row)) {
		if (STATS_ROW_METADATA.has(col)) continue;
		if (value == null) continue;
		out.push({ col, label: humanizeStatKey(col), value: value as number });
	}
	return out;
}