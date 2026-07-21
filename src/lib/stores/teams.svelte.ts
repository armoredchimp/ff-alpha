// teams.svelte.ts
import type { Team, FormationStructure } from "$lib/types/types";

const TEAM_COUNT = 19;

function createDefaultTeam(overrides: Partial<Team> = {}): Team {
	return {
		name: '',
		dbId: 0,
		draftOrder: 0,
		attackers: [],
		midfielders: [],
		defenders: [],
		keepers: [],
		selected: {} as FormationStructure,
		favored: {},
		subs: [],
		unused: [],
		playerCount: 0,
		traits: [],
		rivals: [],
		transferBudget: 500000,
		wins: 0,
		draws: 0,
		losses: 0,
		points: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		formation: '4-4-2',
		formationDisplayed: false,
		manager: [],
		player: false,
		nextOpponentID: 0,
		lastResult: {
			matchId: 0,
			oppId: 0,
			home: false,
			result: '',
			goalsFor: 0,
			goalsAgainst: 0,
			chancePoints: 0,
			chancePointsOpp: 0,
			possWins: 0,
			possWinsOpp: 0
		},
		scores: {
			total: { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0, keeping: 0 },
			attackers: { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 },
			midfielders: { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 },
			defenders: { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 },
			keeper: { passing: 0, keeping: 0 }
		},
		...overrides
	};
}

export const teams = $state<Record<string, Team>>(
	Object.fromEntries(
		Array.from({ length: TEAM_COUNT }, (_, i) => [`team${i + 1}`, createDefaultTeam()])
	)
);

export const playerTeam = $state<Team>(createDefaultTeam({ player: true }));