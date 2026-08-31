import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getIdToken } from '$lib/server/auth';
import { supabase, leagueClientFor } from '$lib/server/supaClient';
import { serverMatchCache } from '$lib/server/serverMatchCache';
import type { MatchBundle, MatchBundlePlayer } from '$lib/types/types'

const STEP = 'match_bundle';

export const GET: RequestHandler = async ({ cookies, url }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = url.searchParams.get('match_id');
    if (!matchId) {
        return json({ error: 'match_id is required' }, { status: 400 });
    }

    const scaling = leagueClientFor(idToken);

    try {
        // Authorize before serving from cache — the bundle is league-scoped and
        // the cache is shared across all users of this process.
        const { data: authRow, error: authErr } = await scaling
            .from('match_results')
            .select('match_id')
            .eq('match_id', matchId)
            .maybeSingle();

        if (authErr) {
            console.error(`[${STEP}] auth check failed:`, authErr.message);
            return json({ error: 'Failed to load match result' }, { status: 500 });
        }
        if (!authRow) {
            return json({ error: 'Match not found' }, { status: 404 });
        }

        if (serverMatchCache[matchId]) {
            return json({ bundle: serverMatchCache[matchId] });
        }

        // ---- 1 & 2: match_results + match_details ----
        const [matchRes, detailsRes] = await Promise.all([
            scaling.from('match_results').select('*').eq('match_id', matchId).single(),
            scaling.from('match_details').select('*').eq('match_id', matchId).single()
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

        // ---- 3: fantasy_match_stats for this match ----
        const fantasyRes = await scaling
            .from('fantasy_match_stats')
            .select('*')
            .eq('match_id', matchId);

        if (fantasyRes.error) {
            console.error(`[${STEP}] fantasy_match_stats failed:`, fantasyRes.error.message);
            return json({ error: 'Failed to load fantasy match stats' }, { status: 500 });
        }
        const fantasyRows = fantasyRes.data ?? [];

        // ---- 4: collect all fixture_ids, fetch currents (reference data) ----
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