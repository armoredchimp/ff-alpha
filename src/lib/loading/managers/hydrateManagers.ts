import { managers, managersByID } from '$lib/stores/generic.svelte';
import { teams } from '$lib/stores/teams.svelte';
import type { Manager } from '$lib/types/types';

export function hydrateManagers(): { teamId: number; managerId: number }[] {
    console.log('Starting manager hydration...');

    // Managers already claimed by a team whose id still resolves — so a
    // replacement doesn't duplicate an active assignment.
    const claimed = new Set<number>();
    for (const teamKey in teams) {
        const team = teams[teamKey as keyof typeof teams];
        const id = typeof team.manager === 'number' ? team.manager : team.manager?.id;
        if (id != null && managersByID[id]) claimed.add(id);
    }

    const reassignments: { teamId: number; managerId: number }[] = [];

    for (const teamKey in teams) {
        const team = teams[teamKey as keyof typeof teams];

        if (typeof team.manager !== 'number') {
            continue;
        }

        const foundManager: Manager | undefined = managersByID[team.manager];

        if (foundManager) {
            team.manager = foundManager;
            continue;
        }

        // Manager left the league between seasons — assign an unclaimed one.
        const replacement = managers.find((m) => !claimed.has(m.id));

        if (!replacement) {
            console.warn(`No unclaimed manager available for ${team.name}`);
            team.manager = null;
            continue;
        }

        console.log(`Manager ${team.manager} for ${team.name} is gone — assigning ${replacement.display_name}`);
        claimed.add(replacement.id);
        team.manager = replacement;
        reassignments.push({ teamId: team.dbId, managerId: replacement.id });
    }

    console.log('Manager hydration complete');
    return reassignments;
}