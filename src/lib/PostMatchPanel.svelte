<script lang="ts">
	import MatchStatsDisplay from './MatchStatsDisplay.svelte';
	import { getCountryUrl } from './data/countryImages';
	import { playersByID } from './stores/generic.svelte';

	let {
		playerId = null as number | null,
		bundlePlayer = null as any    // players[playerId] from the match bundle
	} = $props<{
		playerId?: number | null;
		bundlePlayer?: any;
	}>();

	const player = $derived(playerId != null ? (playersByID[playerId] ?? null) : null);

	// Pair each fixture's stats row with its scores row for the compact cards.
	const fixtureBlocks = $derived.by(() => {
		if (!bundlePlayer) return [];
		const stats = bundlePlayer.statsRows ?? [];
		const scores = bundlePlayer.scoresRows ?? [];
		const scoreByFixture = new Map<number, any>();
		for (const s of scores) scoreByFixture.set(s.fixture_id, s);
		return stats.map((st: any) => ({
			fixtureId: st.fixture_id,
			stats: st,
			scores: scoreByFixture.get(st.fixture_id) ?? null
		}));
	});

	const didNotPlay = $derived(fixtureBlocks.length === 0);

	const fantasy = $derived(bundlePlayer?.fantasy ?? null);
	const nationImage = $derived(player?.nationality ? getCountryUrl(player.nationality) : null);
	const detailedPosition = $derived(player?.detailed_position ?? 'Unknown');
</script>

<aside class="post-match-panel">
	{#if !player}
		<div class="panel-placeholder">
			<p>Hover a player to see their match breakdown.</p>
		</div>
	{:else}
		<div class="panel-identity">
			{#if nationImage}
				<img src={nationImage} alt={player.nationality} class="identity-flag" />
			{/if}
			<div class="identity-text">
				<a href={`/player/${player.id}`} class="identity-name">{player.player_name}</a>
				<span class="identity-sub">
					{player.player_team}{player.player_age ? ` · ${player.player_age}` : ''}{player.detailed_position ? ` · ${player.detailed_position}` : ''}
				</span>
			</div>

			{#if fantasy}
				<div class="fantasy-line">
					{#if fantasy.goals > 0}<span class="fantasy-pill goals">{fantasy.goals} G</span>{/if}
					{#if fantasy.assists > 0}<span class="fantasy-pill assists">{fantasy.assists} A</span>{/if}
					{#if fantasy.clean_sheets > 0}<span class="fantasy-pill cs">CS</span>{/if}
					{#if fantasy.goals === 0 && fantasy.assists === 0 && fantasy.clean_sheets === 0}
						<span class="fantasy-pill none">No returns</span>
					{/if}
				</div>
			{/if}
		</div>

		{#if didNotPlay}
			<p class="panel-dnp">Didn't feature in a real match this gameweek.</p>
		{:else}
			<div class="panel-fixtures">
				{#each fixtureBlocks as block (block.fixtureId)}
					<MatchStatsDisplay
						fixtureId={block.fixtureId}
						stats={block.stats}
						scores={block.scores}
						{detailedPosition}
						compact={true}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</aside>

<style>
	.post-match-panel {
		width: 100%;
		height: 14rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		padding: 0.85rem 1rem;
		margin-bottom: 1rem;
	}

	.panel-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #94a3b8;
		font-size: 0.85rem;
	}

	.panel-identity {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid #eee;
		margin-bottom: 0.6rem;
	}

	.identity-flag {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #e5e7eb;
		flex-shrink: 0;
	}

	.identity-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.identity-name {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
		text-decoration: none;
	}

	.identity-name:hover {
		text-decoration: underline;
		color: #2563eb;
	}

	.identity-sub {
		font-size: 0.72rem;
		color: #94a3b8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fantasy-line {
		margin-left: auto;
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.fantasy-pill {
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: 0.75rem;
		background: #f1f5f9;
		color: #475569;
	}

	.fantasy-pill.goals {
		background: #dcfce7;
		color: #15803d;
	}

	.fantasy-pill.assists {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.fantasy-pill.cs {
		background: #ede9fe;
		color: #6d28d9;
	}

	.fantasy-pill.none {
		background: #f8fafc;
		color: #94a3b8;
		font-weight: 600;
	}

	.panel-dnp {
		color: #94a3b8;
		font-style: italic;
		font-size: 0.85rem;
		margin: 0.5rem 0;
	}

	.panel-fixtures {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>