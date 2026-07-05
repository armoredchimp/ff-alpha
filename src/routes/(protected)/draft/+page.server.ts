// routes/(protected)/draft/+page.server.ts
// Trimmed to load only. The draft write actions (insertTeams, uploadTeamPlayers,
// draftTeamsFinalize, draftUploaded) are replaced by the server-authoritative
// API routes under /api/supabase/draft/*.

import { getLeagueId } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) throw redirect(303, '/');

    try {
        const leagueResponse = await fetch('/api/supabase/league_info');
        const leagueData = await leagueResponse.json();

        if (leagueData.draftComplete) {
            throw redirect(303, leagueData.redirect);
        }

        const numOfTeams = leagueData?.total_teams || 14;
        return { leagueId, numOfTeams };
    } catch (error) {
        if (error instanceof Response && error.status >= 300 && error.status < 400) {
            throw error;
        }
        console.error('Error in draft load:', error);
        return { leagueId, numOfTeams: 14 };
    }
};