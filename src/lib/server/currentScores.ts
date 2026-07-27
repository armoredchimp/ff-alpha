import { supabase } from "$lib/client/supabase/supaClient";

// Current-week scores for a player: 0-2 rows for the given league_week.
export async function getCurrentScores(
    playerId: string | number,
    leagueWeek: number
): Promise<any[]> {
    const { data, error } = await supabase
        .from('current_player_scores')
        .select('*')
        .eq('player_id', playerId)
        .eq('league_week', leagueWeek);

    if (error) {
        console.error('Error fetching current player scores:', error);
        throw error;
    }

    return data ?? []; // 0, 1, or 2 rows
}