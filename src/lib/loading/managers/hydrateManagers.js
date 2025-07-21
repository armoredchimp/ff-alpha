import { managersByID } from '$lib/stores/generic.svelte';
import { teams } from '$lib/stores/teams.svelte';

export function hydrateManagers() {
    console.log('Starting manager hydration...');
    
    // Hydrate all teams
    for (const teamKey in teams) {
        
        const team = teams[teamKey];
        console.log(`manager hydration team: ${team}`)
        const foundManager = managersByID[team.manager]
        if (!foundManager) {
            console.warn(`Manager ${team.manager} not found`)
            return null;
        } 
        team.manager = foundManager;
    }
    
    console.log('Manager hydration complete');
}