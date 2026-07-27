<script lang="ts">
	import LastMatch from '$lib/LastMatch.svelte';
	import Formation from '$lib/Formation.svelte';
	import PostMatchPanel from '$lib/PostMatchPanel.svelte';
	import { clientMatchCache } from '$lib/stores/generic.svelte';
	import { hydrateSelectedSnapshot } from '$lib/utils/formation'; 
	import type { PageData } from './$types';
	import axios from 'axios';

	let { data }: { data: PageData & { team: any; matchDetails: any } } = $props();

	// The match id comes from the team's last result (current-week entry point).
	// Later this generalizes to a route param for arbitrary past matches.
	const matchId = $derived(data.team?.lastResult?.matchId ?? null);

	let bundle = $state<any>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let hoveredPlayerId = $state<number | null>(null);

	// Fetch (or reuse cached) the match bundle whenever the match id changes.
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

	// Hydrate the stored ID-based selected snapshots into Player objects.
	const homeTeam = $derived.by(() => {
		if (!bundle?.details?.home_selected) return null;
		return { selected: hydrateSelectedSnapshot(bundle.details.home_selected) };
	});
	const awayTeam = $derived.by(() => {
		if (!bundle?.details?.away_selected) return null;
		return { selected: hydrateSelectedSnapshot(bundle.details.away_selected) };
	});

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
	<div class="top-buttons">
		{#if data.team}
			<button><a href="/teams/player/main">Back</a></button>
		{/if}
	</div>

	{#if !data.team}
		<p>Team not found</p>
	{:else if data.matchDetails}
		<!-- Existing header (LastMatch → PostMatchHeader in the rename pass) -->
		<LastMatch
			goalDetails={data.matchDetails.goal_details}
			chanceBreakdown={data.matchDetails.chance_breakdown}
			posBreakdown={data.matchDetails.possession_breakdown}
			isHome={data.team.lastResult.home}
			team={data.team}
		/>

		<!-- Shared hover panel above both formations -->
		<PostMatchPanel playerId={hoveredPlayerId} bundlePlayer={hoveredBundlePlayer} />

		{#if loading}
			<p class="pm-status">Loading match…</p>
		{:else if loadError}
			<p class="pm-status error">{loadError}</p>
		{:else if bundle}
			<div class="formations-row">
				{#if homeTeam}
					<div class="formation-col">
						<h3 class="side-label">Home</h3>
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
						<h3 class="side-label">Away</h3>
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
		{/if}
	{:else}
		<p>No match data available</p>
	{/if}
</div>

<style>
	.page-container {
		padding: 1rem;
		margin-bottom: 6rem;
	}

	.top-buttons {
		margin-bottom: 1rem;
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
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
		text-align: center;
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