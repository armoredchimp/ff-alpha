import { teams } from '$lib/stores/teams.svelte';
import { getOpponentTeam } from '$lib/utils/team';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
    // Find the team by name from the URL
    const foundTeam = Object.entries(teams).find(
        ([_, teamData]) => teamData.name.toLowerCase() === params.name.toLowerCase()
    );
    
    if (!foundTeam) {
        return {
            team: null,
            opponent: null
        };
    }
    
    const team = foundTeam[1];
    
    // Get the opponent using the nextOpponentID
    const opponentTeam = getOpponentTeam(team.nextOpponentID);
    
    return {
        team: team,
        opponent: opponentTeam
    };
};