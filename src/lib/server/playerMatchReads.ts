import { supabase } from "$lib/client/supabase/supaClient";

// ---- Recent matches for one player (slug page "last 5") ----
// Paginated from the start so a "browse older matches" UI is a later addition,
// not a read rewrite. Ordered by league_week desc (most recent first).
// Returns paired stats+scores per fixture.
export interface PlayerMatchRow {
    fixture_id: number;
    league_week: number | null;
    stats: any | null;
    scores: any | null;
}

export async function getPlayerRecentMatches(
    playerId: string | number,
    seasonId: string | number,
    limit = 5,
    offset = 0
): Promise<PlayerMatchRow[]> {
    // Pull the player's stat rows most-recent-first, windowed.
    const { data: stats, error: statErr } = await supabase
        .from('current_player_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', seasonId)
        .order('league_week', { ascending: false })
        .order('fixture_id', { ascending: false })
        .range(offset, offset + limit - 1);

    if (statErr) {
        console.error('Error fetching player recent stats:', statErr);
        throw statErr;
    }

    const statRows = stats ?? [];
    if (statRows.length === 0) return [];

    // Fetch the matching scores for exactly those fixtures in one query.
    const fixtureIds = statRows.map((r) => r.fixture_id);
    const { data: scores, error: scoreErr } = await supabase
        .from('current_player_scores')
        .select('*')
        .eq('player_id', playerId)
        .in('fixture_id', fixtureIds);

    if (scoreErr) {
        console.error('Error fetching player recent scores:', scoreErr);
        throw scoreErr;
    }

    const scoreByFixture = new Map<number, any>();
    for (const s of scores ?? []) scoreByFixture.set(s.fixture_id, s);

    return statRows.map((st) => ({
        fixture_id: st.fixture_id,
        league_week: st.league_week ?? null,
        stats: st,
        scores: scoreByFixture.get(st.fixture_id) ?? null
    }));
}

export interface FixtureStatBundle {
    stats: any[];
    scores: any[];
}

export async function getStatsByFixtures(
    fixtureIds: number[]
): Promise<FixtureStatBundle> {
    if (!fixtureIds || fixtureIds.length === 0) {
        return { stats: [], scores: [] };
    }

    const [statsResult, scoresResult] = await Promise.all([
        supabase.from('current_player_stats').select('*').in('fixture_id', fixtureIds),
        supabase.from('current_player_scores').select('*').in('fixture_id', fixtureIds)
    ]);

    if (statsResult.error) {
        console.error('Error fetching stats by fixtures:', statsResult.error);
        throw statsResult.error;
    }
    if (scoresResult.error) {
        console.error('Error fetching scores by fixtures:', scoresResult.error);
        throw scoresResult.error;
    }

    return {
        stats: statsResult.data ?? [],
        scores: scoresResult.data ?? []
    };
}