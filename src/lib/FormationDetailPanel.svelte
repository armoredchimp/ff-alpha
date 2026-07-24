<script lang="ts">
	import PosGroupDisplay from './PosGroupDisplay.svelte';
	import ZoneDisplay from './ZoneDisplay.svelte';
	import { ZONE_LAYOUT } from './utils/formation';
	import type { Team } from './types/types';

	let {
		tabDisplay = 0,
		activeGroup = null as string | null,
		activeZone = null as number | null,
		zoneDisplayData = null as any,
		team = {} as Team,
		opponent = {} as Team,
		opponentMode = 0
	} = $props();

	let zoneLabel = $derived(activeZone != null ? (ZONE_LAYOUT[activeZone]?.label ?? '') : '');
	let showZone = $derived(tabDisplay === 1 && activeZone != null && zoneDisplayData != null);
	let showGroup = $derived(tabDisplay === 0 && activeGroup != null);
</script>

<aside class="detail-panel">
	{#if showGroup}
		<PosGroupDisplay group={activeGroup} {team} opponentTeam={opponent} {opponentMode} />
	{:else if showZone}
		<ZoneDisplay
			fieldPosition={zoneLabel}
			zone={activeZone}
			teamPlayers={zoneDisplayData.teamPlayers.map((tp: any) => tp.player)}
			opponentPlayers={zoneDisplayData.opponentPlayers.map((op: any) => op.player)}
			mode={opponentMode}
			teamName={team.name}
			opponentName={opponent.name}
		/>
	{:else}
		<div class="panel-placeholder">
			<h3>{team.name} vs {opponent.name}</h3>
			<p>
				Hover a {tabDisplay === 1 ? 'zone' : 'positional group'} on the pitch to see the breakdown.
			</p>
		</div>
	{/if}
</aside>

<style>
	.detail-panel {
		flex: 0 0 24rem;
		align-self: flex-start;
		position: sticky;
		top: 1rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		padding: 1rem;
		max-height: 80vh;
		overflow-y: auto;
	}

	.panel-placeholder h3 {
		margin: 0 0 0.4rem 0;
		font-size: 0.95rem;
		color: #1e293b;
	}

	.panel-placeholder p {
		margin: 0;
		font-size: 0.8rem;
		color: #94a3b8;
		line-height: 1.4;
	}
</style>