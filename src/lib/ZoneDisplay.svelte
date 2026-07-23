<script lang="ts">
	import type { Player } from './types/types';
	import FormationDetail from './FormationDetail.svelte';

	let {
		fieldPosition = '',
		zone = 0,
		teamPlayers = [] as Player[],
		opponentPlayers = [] as Player[],
		mode = 0,
		teamName = '',
		opponentName = ''
	} = $props<{
		fieldPosition: string;
		zone: number;
		teamPlayers: Player[];
		opponentPlayers: Player[];
		mode: number;
		teamName: string;
		opponentName: string;
	}>();

	const isKeeper = $derived(fieldPosition === 'Goalkeeper');

	// Aggregate the zone's players, diluted for crowding. Keys are already
	// canonical (defensive / keeper), so no normalization needed downstream.
	function aggregate(players: Player[]) {
		const dilution = players.length === 2 ? 0.9 : players.length >= 3 ? 0.8 : 1;
		const scores: Record<string, number> = {
			total: 0,
			passing: 0,
			keeper: 0,
			finishing: 0,
			attacking: 0,
			possession: 0,
			defensive: 0
		};

		for (const p of players) {
			scores.total += p.total_score || 0;
			scores.passing += p.passing_score || 0;
			scores.keeper += p.keeper_score || 0;
			scores.finishing += p.finishing_score || 0;
			scores.attacking += p.attacking_score || 0;
			scores.possession += p.possession_score || 0;
			scores.defensive += p.defensive_score || 0;
		}

		for (const k of Object.keys(scores)) scores[k] *= dilution;
		return scores;
	}

	const teamScores = $derived(aggregate(teamPlayers));
	const opponentScores = $derived(aggregate(opponentPlayers));
</script>

<FormationDetail
	title={mode === 0 ? fieldPosition : `Zone ${zone}`}
	subtitle={mode === 0 ? 'Zone' : fieldPosition}
	{teamPlayers}
	{opponentPlayers}
	{teamScores}
	{opponentScores}
	{teamName}
	{opponentName}
	{isKeeper}
/>