import { supabase } from "$lib/client/supabase/supaClient";

export async function getCurrentScores(playerId: string | number): Promise<any[]> {
    const { data, error } = await supabase
        .from('current_week_scores')
        .select('*')
        .eq('player_id', playerId);

    if (error) {
        console.error('Error fetching current week scores:', error);
        throw error;
    }

    return data ?? []; // 0, 1, or 2 rows
}