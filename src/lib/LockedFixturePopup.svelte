<script lang="ts">
	import ScoreBars from './ScoreBars.svelte';
	import { lockedPlayerScores, clubAbrByID } from './stores/generic.svelte';
	import type { Player } from '$lib/types/types';

	// Shown in a locked player's hover popup (instead of the basic info card).
	// Explains WHY they're locked: the 1-2 real fixtures that kicked off, each as
	// "ARS vs LIV · 04/19/26" + the match's score graph.
	let { player = null as Player | null } = $props<{ player?: Player | null }>();

	const isKeeper = $derived(player?.detailed_position === 'Goalkeeper');

	// Join the player's fetched score rows with their upcomingFixtures (already on
	// the client) by fixture_id, to get opponent + date per fixture.
	const blocks = $derived.by(() => {
		if (!player?.id) return [];
		const scoreRows = lockedPlayerScores[player.id] ?? [];
		const fixtures = player.upcomingFixtures ?? [];

		const fxById = new Map<number, any>();
		for (const fx of fixtures) fxById.set(fx.fixture_id, fx);

		return scoreRows.map((sr: any) => {
			const fx = fxById.get(sr.fixture_id) ?? null;
			return {
				fixtureId: sr.fixture_id,
				scores: sr,
				teamAbr: fx ? (clubAbrByID[fx.team_id] ?? '—') : '—',
				oppAbr: fx ? (clubAbrByID[fx.opponent_team_id] ?? '—') : '—',
				date: fx?.kickoff ? formatShortDate(fx.kickoff) : ''
			};
		});
	});

	function formatShortDate(iso: string): string {
		const d = new Date(iso);
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const yy = String(d.getFullYear()).slice(-2);
		return `${mm}/${dd}/${yy}`;
	}
</script>

<div class="locked-popup">
	<div class="locked-tag">Match started — locked</div>
	{#if blocks.length === 0}
		<p class="locked-empty">No fixture data available.</p>
	{:else}
		{#each blocks as block (block.fixtureId)}
			<div class="fixture-block">
				<div class="fixture-header">
					<span class="matchup">{block.teamAbr} <span class="vs">vs</span> {block.oppAbr}</span>
					{#if block.date}<span class="date">{block.date}</span>{/if}
				</div>
				<ScoreBars scores={block.scores} isKeeper={isKeeper} compact={true} />
			</div>
		{/each}
	{/if}
</div>

<style>
	.locked-popup {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
		padding: 0.6rem 0.7rem;
		width: 220px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.locked-tag {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #b45309;
		background: #fef3c7;
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		align-self: flex-start;
	}

	.fixture-block {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.fixture-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.matchup {
		font-size: 0.8rem;
		font-weight: 700;
		color: #1e293b;
	}

	.vs {
		font-weight: 400;
		color: #94a3b8;
		font-size: 0.7rem;
	}

	.date {
		font-size: 0.65rem;
		color: #94a3b8;
	}

	.locked-empty {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0;
	}
</style>