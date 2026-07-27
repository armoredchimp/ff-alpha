import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase, supabaseScaling } from '$lib/client/supabase/supaClient';
import { serverMatchCache, type MatchBundle, type MatchBundlePlayer } from '$lib/server/serverMatchCache';

const STEP = 'match_bundle';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const matchId = url.searchParams.get('match_id');
	if (!matchId) {
		return json({ error: 'match_id is required' }, { status: 400 });
	}

	// Immutable per match_id — serve cached bundle if present.
	if (serverMatchCache[matchId]) {
		return json({ bundle: serverMatchCache[matchId] });
	}

	try {
		// ---- 1 & 2: match_results + match_details (scaling client) ----
		const [matchRes, detailsRes] = await Promise.all([
			supabaseScaling.from('match_results').select('*').eq('match_id', matchId).single(),
			supabaseScaling.from('match_details').select('*').eq('match_id', matchId).single()
		]);

		if (matchRes.error) {
			console.error(`[${STEP}] match_results failed:`, matchRes.error.message);
			return json({ error: 'Failed to load match result' }, { status: 500 });
		}
		if (detailsRes.error) {
			console.error(`[${STEP}] match_details failed:`, detailsRes.error.message);
			return json({ error: 'Failed to load match details' }, { status: 500 });
		}

		const match = matchRes.data;
		const details = detailsRes.data;

		// ---- 3: fantasy_match_stats for this match (scaling client) ----
		const fantasyRes = await supabaseScaling
			.from('fantasy_match_stats')
			.select('*')
			.eq('match_id', matchId);

		if (fantasyRes.error) {
			console.error(`[${STEP}] fantasy_match_stats failed:`, fantasyRes.error.message);
			return json({ error: 'Failed to load fantasy match stats' }, { status: 500 });
		}
		const fantasyRows = fantasyRes.data ?? [];

		// ---- 4: collect all fixture_ids, fetch currents (base client) ----
		const allFixtureIds = Array.from(
			new Set(fantasyRows.flatMap((r) => (r.fixture_ids ?? []) as number[]))
		);

		let statsRows: any[] = [];
		let scoresRows: any[] = [];
		if (allFixtureIds.length > 0) {
			const [statsRes, scoresRes] = await Promise.all([
				supabase.from('current_player_stats').select('*').in('fixture_id', allFixtureIds),
				supabase.from('current_player_scores').select('*').in('fixture_id', allFixtureIds)
			]);

			if (statsRes.error) {
				console.error(`[${STEP}] current_player_stats failed:`, statsRes.error.message);
				return json({ error: 'Failed to load player stats' }, { status: 500 });
			}
			if (scoresRes.error) {
				console.error(`[${STEP}] current_player_scores failed:`, scoresRes.error.message);
				return json({ error: 'Failed to load player scores' }, { status: 500 });
			}
			statsRows = statsRes.data ?? [];
			scoresRows = scoresRes.data ?? [];
		}

		// ---- 5: regroup by player_id ----
		// Match currents to a player by BOTH player_id and fixture membership,
		// since two players share a fixture. fixture_ids on the fantasy row is
		// the authoritative set of fixtures that fed that player's contribution.
		const players: Record<number, MatchBundlePlayer> = {};

		for (const fr of fantasyRows) {
			const pid = fr.player_id as number;
			const fixtureIds = (fr.fixture_ids ?? []) as number[];
			const fixtureSet = new Set(fixtureIds);

			players[pid] = {
				fantasy: {
					goals: fr.goals ?? 0,
					assists: fr.assists ?? 0,
					clean_sheets: fr.clean_sheets ?? 0,
					sub: fr.sub ?? false,
					favored_fixture_id: fr.favored_fixture_id ?? null
				},
				fixtureIds,
				statsRows: statsRows.filter(
					(s) => s.player_id === pid && fixtureSet.has(s.fixture_id)
				),
				scoresRows: scoresRows.filter(
					(s) => s.player_id === pid && fixtureSet.has(s.fixture_id)
				)
			};
		}

		const bundle: MatchBundle = { match, details, players };

		serverMatchCache[matchId] = bundle;
		return json({ bundle });
	} catch (err: any) {
		console.error(`[${STEP}] unexpected error:`, err?.message ?? err);
		return json({ error: 'Failed to assemble match bundle' }, { status: 500 });
	}
};