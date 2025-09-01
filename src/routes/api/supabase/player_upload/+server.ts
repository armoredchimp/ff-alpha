import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId } from "$lib/server/auth";
import { supabaseScaling } from "$lib/supabase/supaClient";

export const POST: RequestHandler = async ({ cookies, request }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) {
        return json({ error: 'No league ID found' }, { status: 401 });
    }
    
    console.log('League ID from cookie:', leagueId, typeof leagueId);
    
    const formData = await request.formData();
    const teamPlayersJson = formData.get('teamPlayers') as string;
    const teamFormationsJson = formData.get('teamFormations') as string;
    
    console.log('Received teamPlayers JSON:', teamPlayersJson);
    console.log('Received teamFormations JSON:', teamFormationsJson);
    
    try {
        const teamPlayers = JSON.parse(teamPlayersJson);
        const teamFormations = teamFormationsJson ? JSON.parse(teamFormationsJson) : [];
        
        // // Helper function to extract player IDs from player objects
        // const extractPlayerIds = (playerArray: any) => {
        //     if (!Array.isArray(playerArray)) return [];
        //     return playerArray.map(player => player.id);
        // };
        
        // Convert player objects to ID arrays and add league_id
        const teamPlayersWithIds = teamPlayers.map((tp: any) => ({
            league_id: leagueId,
            team_id: tp.team_id,
            attackers: tp.attackers,
            midfielders: tp.midfielders,
            defenders: tp.defenders,
            keepers: tp.keepers,
            selected: tp.selected,
            subs: tp.subs,
            unused: tp.unused
        }));
        
        console.log('Team players with IDs only:', JSON.stringify(teamPlayersWithIds, null, 2));
        
        // Delete any existing team_players for this league first
        const { error: deleteError } = await supabaseScaling
            .from('team_players')
            .delete()
            .eq('league_id', leagueId);
        
        if (deleteError) {
            console.error('Error deleting existing team players:', deleteError);
        }
        
        // Insert new team players
        const { data, error } = await supabaseScaling
            .from('team_players')
            .insert(teamPlayersWithIds);
        
        if (error) {
            console.error('Error inserting team players:', error);
            console.error('Failed data:', teamPlayersWithIds);
            return json({ error: 'Failed to insert team players' }, { status: 500 });
        }
        
        console.log('Team players successfully uploaded:', data);
        
        // Update formations in teams table if provided
        if (teamFormations && teamFormations.length > 0) {
            console.log('Updating formations for teams:', teamFormations);
            
            for (const teamFormation of teamFormations) {
                const { error: updateError } = await supabaseScaling
                    .from('teams')
                    .update({ formation: teamFormation.formation })
                    .eq('team_id', teamFormation.team_id)
                    .eq('league_id', leagueId);
                
                if (updateError) {
                    console.error(`Error updating formation for team ${teamFormation.team_id}:`, updateError);
                }
            }
            
            console.log('Formations updated successfully');
        }
        
        return json({ success: true });
        
    } catch (error) {
        console.error('Failed to process team players data:', error);
        return json({ error: 'Failed to process team players data' }, { status: 500 });
    }
};