import { teams } from '$lib/stores/teams.svelte';
import type { PageLoad } from './$types';


export const load: PageLoad = ({ params }) => {
    const foundTeam = Object.entries(teams).find(
        ([_, teamData]) => teamData.name.toLowerCase() === params.name.toLowerCase()
    );
   
    return {
        team: foundTeam ? foundTeam[1] : null,
    };
};