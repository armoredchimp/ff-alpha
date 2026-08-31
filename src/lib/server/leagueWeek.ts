import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, supabaseScaling } from "$lib/server/supaClient";

// Resolves the current league_week for a fantasy league, server-side.
// fantasy league (leagues.countries_code) -> league_info_reference.league_week.
// Mirrors the getMatchweek() logic in the league_info route so both agree.
//
// Pass a request-scoped scaling client where one is available; callers without
// a user token (e.g. league creation) fall back to the service client.
export async function getLeagueWeekForLeague(
    leagueId: string,
    scalingClient?: SupabaseClient
): Promise<number | null> {
    const scaling = scalingClient ?? supabaseScaling;

    const { data: league, error: leagueErr } = await scaling
        .from('leagues')
        .select('countries_code')
        .eq('league_id', leagueId)
        .single();

    if (leagueErr || !league) {
        console.error('getLeagueWeekForLeague: league lookup failed', leagueErr);
        return null;
    }

    const { data: ref, error: refErr } = await supabase
        .from('league_info_reference')
        .select('league_week')
        .eq('countries_code', league.countries_code)
        .single();

    if (refErr || !ref) {
        console.error('getLeagueWeekForLeague: week lookup failed', refErr);
        return null;
    }

    return ref.league_week ?? null;
}