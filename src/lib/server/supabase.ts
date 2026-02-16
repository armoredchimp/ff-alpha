import { supabaseScaling } from '$lib/client/supabase/supaClient';

export async function getFantasyStats(leagueId: string, playerId: string) {
    const { data, error } = await supabaseScaling
        .from('fantasy_stats')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', playerId)
        .single();

    if (error) {
        console.error('Supabase fantasy_stats error:', error);
        return null;
    }

    return data;
}