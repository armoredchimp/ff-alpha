import { managersByID } from '$lib/stores/generic.svelte';
import { teams } from '$lib/stores/teams.svelte';
import type { Manager } from '$lib/types/types';

export function hydrateManagers(): void {
    console.log('Starting manager hydration...');
    
    // Hydrate all teams
    for (const teamKey in teams) {
        const team = teams[teamKey as keyof typeof teams];
        
        // Skip if manager is not a number (already hydrated or null)
        if (typeof team.manager !== 'number') {
            continue;
        }
        
        const foundManager: Manager | undefined = managersByID[team.manager];
        
        if (!foundManager) {
            console.warn(`Manager ${team.manager} for ${team.name} not found`);
            team.manager = null;
            continue;
        }
        
        team.manager = foundManager;
    }
    
    console.log('Manager hydration complete');
}