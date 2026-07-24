<script lang="ts">
	import type { Team } from './types/types';
	import FormationDetail from './FormationDetail.svelte';
	import { normalizeScores } from './data/scoreConfig';
	import {
		getPlayersFromGroup,
		recalculateSectionScores,
		getGroupScoresWithDilution,
        getDilutionFactor,
		getOpponentGroup
	} from './utils/team';

	let {
		group = '',
		team = {} as Team,
		opponentTeam = {} as Team,
		opponentMode = 0
	} = $props<{
		group: string;
		team: Team;
		opponentTeam: Team;
		opponentMode: number;
	}>();

	recalculateSectionScores(opponentTeam);

	const opponentGroupToDisplay = $derived(getOpponentGroup(group, opponentMode));

	const teamPlayers = $derived(getPlayersFromGroup(team, group));
	const opponentPlayers = $derived(
		opponentGroupToDisplay ? getPlayersFromGroup(opponentTeam, opponentGroupToDisplay) : []
	);

	function withTotal(scores: Record<string, number>, players: any[]) {
        const raw = players.reduce((sum, p) => sum + (p.total_score || 0), 0);
        return { ...scores, total: raw * getDilutionFactor(players.length) };
    }

    const teamScores = $derived(
        withTotal(
            normalizeScores(getGroupScoresWithDilution(team, group, teamPlayers.length)),
            teamPlayers
        )
    );

    const opponentScores = $derived(
        opponentGroupToDisplay
            ? withTotal(
                normalizeScores(
                    getGroupScoresWithDilution(opponentTeam, opponentGroupToDisplay, opponentPlayers.length)
                ),
                opponentPlayers
            )
            : {}
    );

	const isKeeper = $derived(group === 'keepers');

	function formatGroupName(g: string): string {
		const formatted = g.charAt(0).toUpperCase() + g.slice(1);
		return formatted === 'Keepers' ? 'Goalkeeper' : formatted;
	}
</script>

<FormationDetail
	title={formatGroupName(group)}
	subtitle="Positional group"
	{teamPlayers}
	{opponentPlayers}
	{teamScores}
	{opponentScores}
	teamName={team.name}
	opponentName={opponentTeam.name}
	{isKeeper}
/>