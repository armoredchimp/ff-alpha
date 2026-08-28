<script lang="ts">
	import axios from 'axios';
	import { untrack } from 'svelte';
	import MatchStatsDisplay from '$lib/MatchStatsDisplay.svelte';
	import { getSeasonID } from './stores/league.svelte';
   
    interface PlayerMatchRow {
		fixture_id: number;
		league_week: number | null;
		stats: any | null;
		scores: any | null;
	}

	let {
		playerId,
		detailedPosition = 'Unknown',
		pageSize = 5
	} = $props<{
		playerId: string | number;
		detailedPosition?: string;
		pageSize?: number;
	}>();

	type Mode = 'real' | 'fantasy';
	let mode = $state<Mode>('real');

	// --- real matches ---
	let realRows = $state<PlayerMatchRow[]>([]);
	let realOffset = $state(0);
	let realLoading = $state(false);
	let realDone = $state(false);
	let realError = $state<string | null>(null);

	// Reload whenever the page is navigated to a different player. untrack() so
	// the state writes below don't re-trigger this effect.
	$effect(() => {
		const id = playerId;
		untrack(() => {
			realRows = [];
			realOffset = 0;
			realDone = false;
			realError = null;
			loadRealPage(id, 0);
		});
	});

	async function loadRealPage(id: string | number, offset: number) {
		realLoading = true;
		realError = null;
		try {
			const res = await fetch(
				`/api/supabase/player_recents?player_id=${id}&season_id=${getSeasonID()}&limit=${pageSize}&offset=${offset}`
			);
			if (!res.ok) throw new Error(`Request failed: ${res.status}`);
			const { matches } = await res.json();
			const rows: PlayerMatchRow[] = matches ?? [];

			realRows = offset === 0 ? rows : [...realRows, ...rows];
			realOffset = offset + rows.length;
			if (rows.length < pageSize) realDone = true;
		} catch (err) {
			console.error('Failed to load recent matches:', err);
			realError = 'Could not load recent matches.';
		} finally {
			realLoading = false;
		}
	}

	function loadMore() {
		if (realLoading || realDone) return;
		loadRealPage(playerId, realOffset);
	}
</script>

<div class="recent-matches">
	<div class="section-header">
		<h3 class="section-title">Recent Matches</h3>
		<div class="mode-toggle" role="group" aria-label="Match type">
			<button
				class="mode-btn"
				class:active={mode === 'real'}
				onclick={() => (mode = 'real')}
			>Real</button>
			<button
				class="mode-btn"
				class:active={mode === 'fantasy'}
				onclick={() => (mode = 'fantasy')}
			>Fantasy</button>
		</div>
	</div>

	{#if mode === 'real'}
		{#if realError}
			<p class="placeholder-text">{realError}</p>
		{:else if realRows.length === 0 && realLoading}
			<p class="placeholder-text">Loading recent matches…</p>
		{:else if realRows.length === 0}
			<p class="placeholder-text">No match data recorded this season.</p>
		{:else}
			{#each realRows as row (row.fixture_id)}
				<MatchStatsDisplay
					fixtureId={row.fixture_id}
					stats={row.stats}
					scores={row.scores}
					{detailedPosition}
				/>
			{/each}

			{#if !realDone}
				<button class="load-more" onclick={loadMore} disabled={realLoading}>
					{realLoading ? 'Loading…' : 'Load older matches'}
				</button>
			{/if}
		{/if}
	{:else}
		<!-- Task 4: FantasyMatchCard list drops in here, same shape as above. -->
		<p class="placeholder-text">Fantasy match history coming soon.</p>
	{/if}
</div>

<style>
	.recent-matches {
		border-top: 1px solid #eee;
		padding-top: 1.5rem;
		margin-top: 1.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #999;
		margin: 0;
		font-weight: 600;
	}

	.mode-toggle {
		display: flex;
		gap: 0.25rem;
		background: #f3f4f6;
		border-radius: 6px;
		padding: 0.15rem;
	}

	.mode-btn {
		border: none;
		background: transparent;
		border-radius: 4px;
		padding: 0.3rem 0.75rem;
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #64748b;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.mode-btn:hover {
		color: #334155;
	}

	.mode-btn.active {
		background: #fff;
		color: #1e293b;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	.load-more {
		width: 100%;
		padding: 0.6rem;
		background: #f5f6f8;
		border: 1px solid #eee;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 600;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.load-more:hover:not(:disabled) {
		background: #eef0f3;
	}

	.load-more:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.placeholder-text {
		color: #888;
		font-style: italic;
	}
</style>