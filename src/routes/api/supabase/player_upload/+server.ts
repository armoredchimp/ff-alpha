import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId } from "$lib/server/auth";
import { supabaseScaling } from "$lib/client/supabase/supaClient";

export const POST: RequestHandler = async ({ cookies, request }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) {
        return json({ error: 'No league ID found' }, { status: 401 });
    }
   
    console.log('League ID from cookie:', leagueId, typeof leagueId);
   
    const formData = await request.formData();
    const teamPlayersJson = formData.get('teamPlayers') as string;
    const teamFormationsJson = formData.get('teamFormations') as string;
    const isPartialUpdate = formData.get('isPartialUpdate') === 'true';
   
    console.log('Received teamPlayers JSON:', teamPlayersJson);
    console.log('Received teamFormations JSON:', teamFormationsJson);
    console.log('Is partial update:', isPartialUpdate);
   
    try {
        const teamPlayers = JSON.parse(teamPlayersJson);
        const teamFormations = teamFormationsJson ? JSON.parse(teamFormationsJson) : [];
       
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
       
        if (isPartialUpdate) {
            // PARTIAL UPDATE: Only update specific teams
            console.log('Performing partial update for specific teams only');
            
            // Extract team IDs that we're updating
            const teamIdsToUpdate = teamPlayersWithIds.map((tp: any) => tp.team_id);
            console.log('Team IDs to update:', teamIdsToUpdate);
            
            // Delete only the specific teams' players
            const { error: deleteError } = await supabaseScaling
                .from('team_players')
                .delete()
                .eq('league_id', leagueId)
                .in('team_id', teamIdsToUpdate);
           
            if (deleteError) {
                console.error('Error deleting specific team players:', deleteError);
                return json({ error: 'Failed to delete existing team players' }, { status: 500 });
            }
            
            console.log('Deleted team_players for teams:', teamIdsToUpdate);
            
        } else {
            // FULL UPDATE: Replace all teams
            console.log('Performing full update - replacing all teams');
            
            // Delete all existing team_players for this league
            const { error: deleteError } = await supabaseScaling
                .from('team_players')
                .delete()
                .eq('league_id', leagueId);
           
            if (deleteError) {
                console.error('Error deleting all existing team players:', deleteError);
                return json({ error: 'Failed to delete existing team players' }, { status: 500 });
            }
            
            console.log('Deleted all team_players for league');
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
       
        const updateType = isPartialUpdate ? 'partial' : 'full';
        return json({ 
            success: true, 
            message: `Successfully performed ${updateType} update for ${teamPlayersWithIds.length} team(s)` 
        });
       
    } catch (error) {
        console.error('Failed to process team players data:', error);
        return json({ error: 'Failed to process team players data' }, { status: 500 });
    }
};