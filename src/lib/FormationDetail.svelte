<script lang="ts">
	import ScoreRow from './ScoreRow.svelte';
	import { getCountryUrl } from './data/countryImages';
	import { playerLastName } from './utils/common';
	import { SCORE_CONFIG, scoreKeysFor, MAX_SCORE } from './data/scoreConfig';
	import type { Player } from './types/types';

	let {
		title = '',
		subtitle = '',
		teamPlayers = [] as Player[],
		opponentPlayers = [] as Player[],
		teamScores = {} as Record<string, number>,
		opponentScores = {} as Record<string, number>,
		teamName = '',
		opponentName = '',
		isKeeper = false
	} = $props();

	let hasPlayers = $derived(teamPlayers.length > 0 || opponentPlayers.length > 0);
	let hasBoth = $derived(teamPlayers.length > 0 && opponentPlayers.length > 0);
	let keys = $derived(scoreKeysFor(isKeeper));

	// Which side to show when only one team occupies this group/zone
	let soloScores = $derived(teamPlayers.length > 0 ? teamScores : opponentScores);
	let soloName = $derived(teamPlayers.length > 0 ? teamName : opponentName);

	// Totals shown as a headline rather than a bar — keeps `total` from
	// dominating the bar scale the way it did before.
	let teamTotal = $derived(teamScores.total ?? 0);
	let opponentTotal = $derived(opponentScores.total ?? 0);
</script>

<div class="panel-body">
	<div class="panel-title-block">
		<h3 class="panel-title">{title}</h3>
		{#if subtitle}<span class="panel-subtitle">{subtitle}</span>{/if}
	</div>

	{#if !hasPlayers}
		<p class="panel-empty">No players in this area.</p>
	{:else}
		<div class="players-section">
			{#if teamPlayers.length > 0}
				<div class="side">
					<span class="side-name team">{teamName}</span>
					<div class="players-grid">
						{#each teamPlayers as player (player.id)}
							<div class="player-chip">
								<img
									src={getCountryUrl(player.nationality)}
									alt={player.nationality}
									class="player-flag team-border"
								/>
								<span class="player-name">{playerLastName(player.player_name)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if opponentPlayers.length > 0}
				<div class="side">
					<span class="side-name opponent">{opponentName}</span>
					<div class="players-grid">
						{#each opponentPlayers as player (player.id)}
							<div class="player-chip">
								<img
									src={getCountryUrl(player.nationality)}
									alt={player.nationality}
									class="player-flag opponent-border"
								/>
								<span class="player-name">{playerLastName(player.player_name)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="scores-block">
			{#if hasBoth}
				<div class="totals-row">
					<span class="total team">{Math.round(teamTotal)}</span>
					<span class="total-label">Total</span>
					<span class="total opponent">{Math.round(opponentTotal)}</span>
				</div>
				{#each keys as key}
					<ScoreRow
						mode="compare"
						label={SCORE_CONFIG[key].label}
						teamValue={teamScores[key] ?? 0}
						opponentValue={opponentScores[key] ?? 0}
					/>
				{/each}
			{:else}
				<div class="totals-row single">
					<span class="total-label">{soloName}</span>
					<span class="total">{Math.round(soloScores.total ?? 0)}</span>
				</div>
				{#each keys as key}
					<ScoreRow
						mode="single"
						label={SCORE_CONFIG[key].label}
						color={SCORE_CONFIG[key].color}
						value={soloScores[key] ?? 0}
						max={MAX_SCORE}
					/>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Insight slots go here later (key battle, standouts, recent form) -->
	<div class="insights-slot"></div>
</div>

<style>
	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel-title-block {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.5rem;
	}

	.panel-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.panel-subtitle {
		font-size: 0.7rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.panel-empty {
		color: #94a3b8;
		font-style: italic;
		font-size: 0.8rem;
		margin: 0;
	}

	.players-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.side-name {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.side-name.team {
		color: #3b82f6;
	}

	.side-name.opponent {
		color: #ef4444;
	}

	.players-grid {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.player-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		width: 3.1rem;
	}

	.player-flag {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #e5e7eb;
		background: #f1f5f9;
	}

	.player-flag.team-border {
		border-color: #bfdbfe;
	}

	.player-flag.opponent-border {
		border-color: #fecaca;
	}

	.player-name {
		font-size: 0.6rem;
		color: #4b5563;
		text-align: center;
		max-width: 3.1rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.scores-block {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.6rem 0.5rem;
		background: #f9fafb;
		border-radius: 0.375rem;
	}

	.totals-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.25rem 0.4rem;
		border-bottom: 1px solid #eceff2;
		margin-bottom: 0.2rem;
	}

	.totals-row.single {
		justify-content: space-between;
	}

	.total-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
		font-weight: 600;
	}

	.total {
		font-size: 0.95rem;
		font-weight: 700;
		color: #475569;
	}

	.total.team {
		color: #3b82f6;
	}

	.total.opponent {
		color: #ef4444;
	}

	.insights-slot {
		display: contents;
	}
</style>