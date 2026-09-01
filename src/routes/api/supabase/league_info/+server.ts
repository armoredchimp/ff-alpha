import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId, getIdToken } from "$lib/server/auth";
import { supabase, supabaseScaling, leagueClientFor } from "$lib/server/supaClient";
import { generateLeagueSchedule } from "$lib/utils/league";
import { type Schedule, isValidSchedule } from "$lib/types/types";

const maxGames = {
    1: 38,
    2: 38,
    3: 34,
    4: 34,
    5: 38
};

async function getMatchweek(countriesCode: number) {
    const { data: leagueInfo, error } = await supabase
        .from('league_info_reference')
        .select('league_week')
        .eq('countries_code', countriesCode)
        .single()

    if (error) {
        console.error('Error fetching current matchweek from league info reference', error);
        return 1;
    }

    return leagueInfo.league_week
}

export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const idToken = getIdToken(cookies);
        const leagueId = getLeagueId(cookies);

        if (!idToken) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!leagueId) {
            return json({ error: 'No league ID found' }, { status: 400 });
        }

        // RLS scopes this to leagues the user belongs to.
        const { data: league, error } = await leagueClientFor(idToken)
            .from('leagues')
            .select('total_teams, draft_complete, countries_code, schedule')
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

            const newSchedule = generateLeagueSchedule(
                league.total_teams,
                maxGames[league.countries_code as keyof typeof maxGames]
            );

            // Write stays on the service key — no write policies yet.
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
            redirect: league.draft_complete ? '/main' : '/draft'
        });

    } catch (error) {
        console.error('Error in league-info endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};