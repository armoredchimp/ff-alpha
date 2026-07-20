import { supabase } from "$lib/client/supabase/supaClient";

export async function getCurrentStats(playerId: string | number): Promise<any[]> {
    const { data, error } = await supabase
        .from('current_week_stats')
        .select('*')
        .eq('player_id', playerId);

    if (error) {
        console.error('Error fetching current week stats:', error);
        throw error;
    }

    return data ?? []; // 0, 1, or 2 rows
}