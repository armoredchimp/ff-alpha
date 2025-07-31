import { teams } from "$lib/stores/teams.svelte";
import { calculateTotalScores } from "$lib/utils";
import type { Team } from "$lib/types/types";

export function hydrateTeams(): void {
    Object.values(teams).forEach((team: Team) => {
        calculateTotalScores(team);
    });
}