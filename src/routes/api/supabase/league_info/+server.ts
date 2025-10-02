import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId } from "$lib/server/auth";
import { supabase, supabaseScaling } from "$lib/client/supabase/supaClient";
import { generateLeagueSchedule } from "$lib/utils/league";
import { type Schedule, isValidSchedule } from "$lib/types/types";

const maxGames = {
    1: 38,
    2: 38,
    3: 34,
    4: 34,
    5: 38
};

async function getMatchweek(countryCode: number){
          const { data: leagueInfo, error } = await supabase
            .from('league_info_reference')
            .select('current_matchweek')
            .eq('country_code', countryCode)
            .single()

        if (error) {
            console.error('Error fetching current matchweek from league info reference', error);
            return 1;
        }

        return leagueInfo.current_matchweek
}


export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const leagueId = getLeagueId(cookies);
       
        if (!leagueId) {
            return json({ error: 'No league ID found' }, { status: 400 });
        }
       
        const { data: league, error } = await supabaseScaling
            .from('leagues')
            .select('total_teams, draft_complete, countries_code, schedule')
            .eq('league_id', leagueId)
            .single();
       
        if (error) {
            console.error('Error fetching league info:', error);
            return json({ error: 'Failed to fetch league info' }, { status: 500 });
        }
       
        if (!league) {
            return json({ error: 'League not found' }, { status: 404 });
        }
        
        const currentMatchweek = await getMatchweek(league.countries_code)

        if (!isValidSchedule(league.schedule)) {
            console.log('Invalid or missing schedule, generating new one...');
            
            // Generate new schedule
            const newSchedule = generateLeagueSchedule(
                league.total_teams, 
                maxGames[league.countries_code as keyof typeof maxGames]
            );
            
            // Update league table with new schedule
            const { error: updateError } = await supabaseScaling
                .from('leagues')
                .update({ schedule: newSchedule })
                .eq('league_id', leagueId);
                
            if (updateError) {
                console.error('Error updating league schedule:', updateError);
            } else {
                league.schedule = newSchedule; 
            }
        }
       
        return json({
            draftComplete: league.draft_complete,
            numOfTeams: league.total_teams,
            countriesCode: league.countries_code,
            currentMatchweek: currentMatchweek,
            schedule: league.schedule as Schedule, 
            redirect: league.draft_complete ? '/teams/player/main' : '/draft'
        });
       
    } catch (error) {
        console.error('Error in league-info endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};