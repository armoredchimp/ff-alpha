import { playersByID, injuredByFantasyTeam } from '$lib/stores/generic.svelte';
import { createFormationStructure, hydrateSelected } from '$lib/utils/formation';
import { teams, playerTeam } from '$lib/stores/teams.svelte';
import type { Team, Player, FormationStructure } from '$lib/types/types';

type PositionArray = 'attackers' | 'midfielders' | 'defenders' | 'keepers';

export function hydratePlayers(): void {
    console.log('Starting player hydration...');

    const positionArrays: PositionArray[] = ['attackers', 'midfielders', 'defenders', 'keepers'];
    const fantasyInjured: Record<string, Player[]> = {};

    for (const teamKey in teams) {
        const team = teams[teamKey as keyof typeof teams];

        if (team.formation) {
            if (!team.selected || Object.keys(team.selected).length === 0) {
                team.selected = createFormationStructure(team.formation) as FormationStructure;
            }
        }

        positionArrays.forEach(position => {
            if (team[position] && Array.isArray(team[position])) {
                const hydratedPlayers = team[position].map((item: number | Player) => {
                    if (typeof item === 'object' && item !== null && 'id' in item) {
                        return item as Player;
                    }
                    const playerId = item as number;
                    const player = playersByID[playerId];
                    if (!player) {
                        console.warn(`Player with ID ${playerId} not found in playersByID for ${team.name} ${position}`);
                        return null;
                    }
                    return player;
                }).filter((player): player is Player => player !== null);

                team[position].length = 0;
                team[position].push(...hydratedPlayers);

                for (const p of hydratedPlayers) {
                    if (p.injured?.category === 'injury' || p.injured?.category === 'suspended') {
                        if (!fantasyInjured[team.name]) fantasyInjured[team.name] = [];
                        fantasyInjured[team.name].push(p);
                    }
                }
            }
        });

        if (team.selected || team.subs || team.unused) {
            hydrateSelected(team);
        }
    }

    positionArrays.forEach(position => {
        if (playerTeam[position] && Array.isArray(playerTeam[position])) {
            const hydratedPlayers = playerTeam[position].map((item: number | Player) => {
                if (typeof item === 'object' && item !== null && 'id' in item) {
                    return item as Player;
                }
                const playerId = item as number;
                const player = playersByID[playerId];
                if (!player) {
                    console.warn(`Player with ID ${playerId} not found in playersByID for ${playerTeam.name} ${position}`);
                    return null;
                }
                return player;
            }).filter((player): player is Player => player !== null);

            playerTeam[position].length = 0;
            playerTeam[position].push(...hydratedPlayers);

            for (const p of hydratedPlayers) {
                if (p.injured?.category === 'injury' || p.injured?.category === 'suspended') {
                    if (!fantasyInjured[playerTeam.name]) fantasyInjured[playerTeam.name] = [];
                    fantasyInjured[playerTeam.name].push(p);
                }
            }
        }
    });

    if (playerTeam.selected || playerTeam.subs || playerTeam.unused) {
        hydrateSelected(playerTeam);
    }

    Object.assign(injuredByFantasyTeam, fantasyInjured);

    console.log('Player hydration complete - all teams and playerTeam hydrated');
}