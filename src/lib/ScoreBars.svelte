<script lang="ts">
	import { SCORE_CONFIG, normalizeScores, scoreKeysFor, MAX_SCORE } from './data/scoreConfig';

	// Renders the 5-score (or keeper 2-score) bar graph for a single score row.
	// Standalone for now (the locked-fixture popup); later this replaces the
	// inline bar markup in MatchStatsDisplay / slug / post-match.
	let {
		scores = null as Record<string, any> | null,
		isKeeper = false,
		compact = false
	} = $props<{
		scores?: Record<string, any> | null;
		isKeeper?: boolean;
		compact?: boolean;
	}>();

	const normalized = $derived(normalizeScores(scores));
	const keys = $derived(scoreKeysFor(isKeeper));

	function width(val: number | undefined): string {
		if (val == null) return '0%';
		return `${Math.max(0, Math.min((val / MAX_SCORE) * 100, 100))}%`;
	}
</script>

<div class="score-bars" class:compact>
	{#each keys as key}
		{@const cfg = SCORE_CONFIG[key]}
		<div class="bar-row">
			<span class="bar-label">{cfg.label}</span>
			<div class="bar-track">
				<div class="bar-fill" style="width: {width(normalized[key])}; background: {cfg.color};"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.score-bars {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.bar-label {
		font-size: 0.65rem;
		color: #64748b;
		min-width: 4.5rem;
		text-align: right;
	}

	.compact .bar-label {
		min-width: 3.5rem;
		font-size: 0.6rem;
	}

	.bar-track {
		flex: 1;
		height: 7px;
		background: #f1f5f9;
		border-radius: 4px;
		overflow: hidden;
	}

	.compact .bar-track {
		height: 5px;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease;
	}
</style>