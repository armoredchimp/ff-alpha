<script lang="ts">
	import { fixturesByID } from '$lib/stores/generic.svelte';
	import { rankMatchStats, dropdownMatchStats } from '$lib/utils';

	// Resolved by the parent (slug page / post-match), NOT derived here — keeps
	// the component identical across screens.
	let {
		stats = null as Record<string, any> | null,
		scores = null as Record<string, any> | null,
		fixtureId,
		detailedPosition
	} = $props<{
		stats?: Record<string, any> | null;
		scores?: Record<string, any> | null;
		fixtureId: number;
		detailedPosition: string;
	}>();

	let expanded = $state(false);

	const MAX_SCORE = 5000;
	const isKeeper = detailedPosition === 'Goalkeeper';

	// Same bars, order, and colors as the seasonal display at the top of the page.
	const allScoreBars = [
		{ label: 'Defensive', key: 'defensive_score', color: '#2563eb' },
		{ label: 'Passing', key: 'passing_score', color: '#16a34a' },
		{ label: 'Possession', key: 'possession_score', color: '#9333ea' },
		{ label: 'Attacking', key: 'attacking_score', color: '#ea580c' },
		{ label: 'Finishing', key: 'finishing_score', color: '#e11d48' },
		{ label: 'Keeper', key: 'keeper_score', color: '#0891b2' }
	];

	const scoreBars = isKeeper
		? allScoreBars.filter((b) => b.key === 'keeper_score' || b.key === 'passing_score')
		: allScoreBars.filter((b) => b.key !== 'keeper_score');

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

	const topStats = $derived(rankMatchStats(stats, detailedPosition));
	const dropdownStats = $derived(dropdownMatchStats(stats));

	function barWidth(val: number | null | undefined): string {
		if (val == null || val <= 0) return '0%';
		return `${Math.min((val / MAX_SCORE) * 100, 100)}%`;
	}

	function fmt(val: any): string {
		if (val == null) return '';
		if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(1);
		return String(val);
	}
</script>

<div class="match-card">
	<div class="match-header-row">
		<h4 class="match-title">{title}</h4>
		<span class="match-date">{dateLabel}</span>
	</div>

	<div class="match-body">
		<!-- Score bars: ~1/4 width, rectangular, same order/colors as seasonal -->
		<div class="match-bars">
			{#each scoreBars as bar}
				{@const val = scores?.[bar.key]}
				<div class="bar-row">
					<span class="bar-label">{bar.label}</span>
					<div class="bar-track">
						<div class="bar-fill" style="width: {barWidth(val)}; background: {bar.color};"></div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Notable stats: 2 rows of 3 -->
		<div class="match-stats-grid">
			{#each topStats as stat}
				<div class="match-stat">
					<span class="match-stat-label">{stat.label}</span>
					<span class="match-stat-value">{fmt(stat.value)}</span>
				</div>
			{/each}
		</div>
	</div>

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
		gap: 0.35rem;
		padding: 0.5rem 0.6rem;
		background: #f9fafb;
		border: 1px solid #f0f0f0;
		border-radius: 6px;
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.bar-label {
		width: 58px;
		font-size: 0.62rem;
		color: #64748b;
		text-align: right;
		flex-shrink: 0;
	}

	.bar-track {
		flex: 1;
		height: 7px;
		background: #eceff2;
		border-radius: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.4s ease;
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
</style>