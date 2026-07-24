<script lang="ts">
	import { MAX_SCORE, TEAM_COLOR, OPPONENT_COLOR, TIE_COLOR } from './data/scoreConfig';

	let {
		label = '',
		color = '#64748b',
		mode = 'single', // 'single' | 'compare'
		value = 0,
		max = MAX_SCORE,
		teamValue = 0,
		opponentValue = 0
	} = $props<{
		label?: string;
		color?: string;
		mode?: 'single' | 'compare';
		value?: number;
		max?: number;
		teamValue?: number;
		opponentValue?: number;
	}>();

	// compare geometry: bar grows out from the centre line toward the winner
	let diff = $derived(teamValue - opponentValue);
	let pct = $derived.by(() => {
		const maxPossible = Math.max(teamValue, opponentValue, 1);
		return Math.min((Math.abs(diff) / maxPossible) * 50, 50);
	});
	let winner = $derived(diff > 0 ? 'team' : diff < 0 ? 'opponent' : 'tie');

	let fillPct = $derived(max > 0 ? Math.min((value / max) * 100, 100) : 0);
</script>

<div class="score-row">
	<span class="score-label">{label}</span>

	{#if mode === 'compare'}
		<span class="side-value team">{Math.round(teamValue)}</span>
		<div class="track">
			<div class="track-bg"></div>
			<div class="centre-line"></div>
			{#if winner === 'team'}
				<div
					class="bar team-side"
					style="left: {50 - pct}%; right: 50%; background-color: {TEAM_COLOR};"
				></div>
			{:else if winner === 'opponent'}
				<div
					class="bar opponent-side"
					style="left: 50%; right: {50 - pct}%; background-color: {OPPONENT_COLOR};"
				></div>
			{:else}
				<div
					class="bar tie"
					style="left: 49.4%; right: 49.4%; background-color: {TIE_COLOR};"
				></div>
			{/if}
		</div>
		<span class="side-value opponent">{Math.round(opponentValue)}</span>
	{:else}
		<div class="track">
			<div class="track-bg"></div>
			<div class="bar fill" style="width: {fillPct}%; background-color: {color};"></div>
		</div>
		<span class="side-value" style="color: {color};">{Math.round(value)}</span>
	{/if}
</div>

<style>
	.score-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 1.35rem;
	}

	.score-label {
		flex: 0 0 5.25rem;
		font-size: 0.7rem;
		color: #64748b;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.side-value {
		flex: 0 0 2.2rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-align: center;
	}

	.side-value.team {
		color: #3b82f6;
	}

	.side-value.opponent {
		color: #ef4444;
	}

	.track {
		flex: 1;
		position: relative;
		height: 0.75rem;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.track-bg {
		position: absolute;
		left: 0;
		right: 0;
		height: 0.3rem;
		background: #eceff2;
		border-radius: 0.15rem;
	}

	.centre-line {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 1px;
		height: 100%;
		background: #cbd5e1;
		z-index: 1;
	}

	.bar {
		position: absolute;
		height: 0.6rem;
		border-radius: 0.3rem;
		transition: all 0.25s ease;
		z-index: 2;
	}

	.bar.fill {
		left: 0;
	}

	.bar.team-side {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.bar.opponent-side {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}

	.bar.tie {
		border-radius: 0.1rem;
	}
</style>