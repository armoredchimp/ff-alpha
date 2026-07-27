<script lang="ts">
	import PostMatchHeader from '$lib/PostMatchHeader.svelte';
	import Formation from '$lib/Formation.svelte';
	import PostMatchPanel from '$lib/PostMatchPanel.svelte';
	import { clientMatchCache } from '$lib/stores/generic.svelte';
	import { hydrateSelectedSnapshot } from '$lib/utils/formation';
	  import type { PageData } from './$types';
	import axios from 'axios';

	let { data }: { data: PageData & { matchId: string } } = $props();

	const matchId = $derived(data.matchId);

	let bundle = $state<any>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let hoveredPlayerId = $state<number | null>(null);

	$effect(() => {
		const id = matchId;
		if (!id) {
			bundle = null;
			return;
		}
		if (clientMatchCache[id]) {
			bundle = clientMatchCache[id];
			return;
		}
		loading = true;
		loadError = null;
		axios
			.get('/api/supabase/match_bundle', { params: { match_id: id } })
			.then((res) => {
				const b = res.data.bundle;
				clientMatchCache[id] = b;
				bundle = b;
			})
			.catch((err) => {
				console.error('Failed to load match bundle:', err);
				loadError = 'Failed to load match data';
			})
			.finally(() => {
				loading = false;
			});
	});

	// Hydrate the stored ID-based snapshots into Player objects (cache-safe, keeps
	// injured players — the match already happened).
	const homeTeam = $derived.by(() =>
		bundle?.details?.home_selected
			? { selected: hydrateSelectedSnapshot(bundle.details.home_selected) }
			: null
	);
	const awayTeam = $derived.by(() =>
		bundle?.details?.away_selected
			? { selected: hydrateSelectedSnapshot(bundle.details.away_selected) }
			: null
	);

	const chanceBreakdown = $derived(bundle?.details?.chance_breakdown ?? null);
	const playerData = $derived(bundle?.players ?? {});
	const hoveredBundlePlayer = $derived(
		hoveredPlayerId != null ? (playerData[hoveredPlayerId] ?? null) : null
	);

	function onPlayerHover(id: number | null) {
		hoveredPlayerId = id;
	}
</script>

<div class="page-container">
	{#if loading}
		<p class="pm-status">Loading match…</p>
	{:else if loadError}
		<p class="pm-status error">{loadError}</p>
	{:else if bundle}
		<!-- Neutral header, sourced entirely from the bundle -->
		<PostMatchHeader
			match={bundle.match}
			details={bundle.details}
		/>

		<!-- Shared hover panel above both formations -->
		<PostMatchPanel playerId={hoveredPlayerId} bundlePlayer={hoveredBundlePlayer} />

		<div class="formations-row">
			{#if homeTeam}
				<div class="formation-col">
					<h3 class="side-label home">{bundle.match?.home_team_name ?? 'Home'}</h3>
					<Formation
						team={homeTeam}
						mode="postmatch"
						side="home"
						{chanceBreakdown}
						{playerData}
						{onPlayerHover}
						zonesVisible={true}
					/>
				</div>
			{/if}
			{#if awayTeam}
				<div class="formation-col">
					<h3 class="side-label away">{bundle.match?.away_team_name ?? 'Away'}</h3>
					<Formation
						team={awayTeam}
						mode="postmatch"
						side="away"
						{chanceBreakdown}
						{playerData}
						{onPlayerHover}
						zonesVisible={true}
					/>
				</div>
			{/if}
		</div>
	{:else}
		<p class="pm-status">No match found.</p>
	{/if}
</div>

<style>
	.page-container {
		padding: 1rem;
		margin-bottom: 6rem;
	}

	.formations-row {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		width: 100%;
	}

	.formation-col {
		flex: 1 1 50%;
		min-width: 0;
	}

	.side-label {
		font-size: 0.9rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
		text-align: center;
	}

	.side-label.home {
		color: #3b82f6;
	}

	.side-label.away {
		color: #ef4444;
	}

	.pm-status {
		text-align: center;
		color: #94a3b8;
		padding: 2rem;
	}

	.pm-status.error {
		color: #dc2626;
	}
</style>