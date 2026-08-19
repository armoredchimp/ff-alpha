<script lang="ts">
	import { fixturesByID } from '$lib/stores/generic.svelte';
	import { rankMatchStats, dropdownMatchStats } from '$lib/utils/stats';
	import ScoreBars from './ScoreBars.svelte';
	import { playerScores } from './data/scoreConfig';

	// Resolved by the parent (slug page / post-match), NOT derived here — keeps
	// the component identical across screens.
	let {
		stats = null as Record<string, any> | null,
		scores = null as Record<string, any> | null,
		fixtureId,
		detailedPosition,
		compact = false
	} = $props<{
		stats?: Record<string, any> | null;
		scores?: Record<string, any> | null;
		fixtureId: number;
		detailedPosition: string;
		compact?: boolean;
	}>();

	let expanded = $state(false);

	
	const isKeeper = detailedPosition === 'Goalkeeper';


	const fixture = $derived(fixturesByID[fixtureId] ?? null);

	// Player's team id lives on the stats row (added to current_week_stats).
	const teamId = $derived(stats?.team_id ?? null);
	const isAway = $derived(fixture != null && teamId != null && fixture.away_team_id === teamId);

	const opponentName = $derived.by(() => {
		if (!fixture || teamId == null) return null;
		return fixture.home_team_id === teamId ? fixture.away_team_name : fixture.home_team_name;
	});

	// Win / Loss / Draw from the player's side, when both scores exist.
	const result = $derived.by(() => {
		if (!fixture || fixture.home_score == null || fixture.away_score == null) return null;
		const mine = isAway ? fixture.away_score : fixture.home_score;
		const theirs = isAway ? fixture.home_score : fixture.away_score;
		if (mine > theirs) return 'Win';
		if (mine < theirs) return 'Loss';
		return 'Draw';
	});

	const scoreline = $derived.by(() => {
		if (!fixture || fixture.home_score == null || fixture.away_score == null) return null;
		return `${fixture.home_score}-${fixture.away_score}`;
	});

	// "Loss vs Fulham" / "2-3 Win at Manchester United" / "vs Fulham" (no result)
	const title = $derived.by(() => {
		const opp = opponentName ?? 'Unknown';
		const connector = isAway ? 'at' : 'vs';
		const lead = result ? `${scoreline} ${result}` : '';
		return `${lead ? lead + ' ' : ''}${connector} ${opp}`.trim();
	});

	const dateLabel = $derived.by(() => {
		const raw = fixture?.starting_at;
		if (!raw) return '';
		const d = new Date(raw);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	});

	// Compact (post-match panel) shows the 3 most significant; full shows 6.
	// Ranking order is already correct, so slicing the top 3 gives the top 3.
	const topStats = $derived(
		compact ? rankMatchStats(stats, detailedPosition).slice(0, 3) : rankMatchStats(stats, detailedPosition)
	);
	const dropdownStats = $derived(compact ? [] : dropdownMatchStats(stats));

	function fmt(val: any): string {
		if (val == null) return '';
		if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(1);
		return String(val);
	}
</script>

<div class="match-card" class:compact>
	<div class="match-header-row">
		<h4 class="match-title">{title}</h4>
		<span class="match-date">{dateLabel}</span>
	</div>

	<div class="match-body">
		<!-- Score bars: ~1/4 width, rectangular, same order/colors as seasonal -->
		<div class="match-bars">
			<ScoreBars scores={playerScores(scores)} {isKeeper} size="compact" />
		</div>

		<!-- Notable stats: 2 rows of 3 (full) or a single row of 3 (compact) -->
		<div class="match-stats-grid">
			{#each topStats as stat}
				<div class="match-stat">
					<span class="match-stat-label">{stat.label}</span>
					<span class="match-stat-value">{fmt(stat.value)}</span>
				</div>
			{/each}
		</div>
	</div>

	{#if !compact}
		<!-- Expandable: everything on the row that isn't null -->
		<button
			class="dropdown-toggle"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
		>
			<span>All match stats</span>
			<span class="chevron">{expanded ? '▲' : '▼'}</span>
		</button>

		{#if expanded}
			<div class="dropdown-body">
				{#if dropdownStats.length > 0}
					<div class="dropdown-grid">
						{#each dropdownStats as stat}
							<div class="dropdown-stat">
								<span class="dropdown-stat-label">{stat.label}</span>
								<span class="dropdown-stat-value">{fmt(stat.value)}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="dropdown-empty">No match stats recorded.</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.match-card {
		border: 1px solid #eee;
		border-radius: 8px;
		padding: 1rem;
		background: #fff;
		margin-bottom: 0.75rem;
	}

	.match-header-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}

	.match-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1e293b;
		max-width: 55%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.match-date {
		font-size: 0.8rem;
		color: #94a3b8;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.match-body {
		display: flex;
		gap: 1.25rem;
		align-items: stretch;
	}

	/* ~1/4 width, slightly wider than tall */
	.match-bars {
		flex: 0 0 25%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0.5rem 0.6rem;
		background: #f9fafb;
		border: 1px solid #f0f0f0;
		border-radius: 6px;
	}

	.match-stats-grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-auto-rows: 1fr;
		gap: 0.6rem;
	}

	.match-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.6rem 0.4rem;
		background: #f9f9f9;
		border: 1px solid #eee;
		border-radius: 6px;
	}

	.match-stat-label {
		font-size: 0.66rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		text-align: center;
		margin-bottom: 0.25rem;
	}

	.match-stat-value {
		font-size: 1.35rem;
		font-weight: 700;
		color: #222;
		min-height: 1.35rem;
	}

	.dropdown-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.85rem;
		padding: 0.5rem 0.6rem;
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

	.dropdown-toggle:hover {
		background: #eef0f3;
	}

	.chevron {
		font-size: 0.7rem;
		color: #94a3b8;
	}

	.dropdown-body {
		margin-top: 0.6rem;
	}

	.dropdown-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.dropdown-stat {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: #fafafa;
		border: 1px solid #f0f0f0;
		border-radius: 5px;
		font-size: 0.8rem;
	}

	.dropdown-stat-label {
		color: #64748b;
	}

	.dropdown-stat-value {
		font-weight: 600;
		color: #334155;
	}

	.dropdown-empty {
		color: #888;
		font-style: italic;
		font-size: 0.85rem;
		margin: 0.4rem 0;
	}

	@media (max-width: 640px) {
		.match-body {
			flex-direction: column;
		}
		.match-bars {
			flex-basis: auto;
		}
	}

	/* Compact variant for the post-match hover panel: tighter, single stat row,
	   no dropdown. Bars stay but the card is denser. */
	.match-card.compact {
		padding: 0.6rem;
		margin-bottom: 0.5rem;
	}

	.compact .match-header-row {
		margin-bottom: 0.5rem;
	}

	.compact .match-title {
		font-size: 0.85rem;
	}

	.compact .match-body {
		gap: 0.75rem;
	}

	.compact .match-stat {
		padding: 0.4rem 0.3rem;
	}

	.compact .match-stat-value {
		font-size: 1.1rem;
		min-height: 1.1rem;
	}

	.compact .match-stat-label {
		font-size: 0.6rem;
	}
</style>