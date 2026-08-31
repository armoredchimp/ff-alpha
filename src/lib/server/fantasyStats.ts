import { supabaseScaling } from "$lib/server/supaClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getFantasyStats(client: SupabaseClient, playerId: string) {
    const { data, error } = await supabaseScaling
        .from('fantasy_stats')
        .select('*')
        .eq('player_id', playerId)
        .single();

    if (error) {
        console.error('Supabase fantasy_stats error:', error);
        return null;
    }

    return data;
}