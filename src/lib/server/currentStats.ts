import { supabase } from "$lib/client/supabase/supaClient";

// Current-week stats for a player: 0-2 rows for the given league_week.
// The table now retains the whole season, so the league_week filter is what
// isolates "this week" — without it this would return every match all season.
export async function getCurrentStats(
    playerId: string | number,
    leagueWeek: number
): Promise<any[]> {
    const { data, error } = await supabase
        .from('current_player_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('league_week', leagueWeek);

    if (error) {
        console.error('Error fetching current player stats:', error);
        throw error;
    }

    return data ?? []; // 0, 1, or 2 rows
}