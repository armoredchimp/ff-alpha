<script lang="ts">
	import FormationPlayer from './FormationPlayer.svelte';
	import PlayerMini from './PlayerMini.svelte';
	import { ZONE_LAYOUT, KEEPER_ZONE, getSlotsByZone, hasZoneInFormation } from './utils/formation';

	let {
		zone,
		mode = 'select',
		team = {} as any,
		opponent = {} as any,
		displayData = null as any,
		viewOpponent = false,
		opponentMode = 0,
		focusedZone = null as number | null,
		dropdownActive = false,
		zIndex = 5
	} = $props();

	const layout = ZONE_LAYOUT[zone];
	const isKeeperZone = zone === KEEPER_ZONE;

	let isSelect = $derived(mode === 'select');
	let teamSlots = $derived(getSlotsByZone(zone, team));
	let opponentSlots = $derived(isKeeperZone ? getSlotsByZone(zone, opponent) : []);

	// Visibility rules are preserved verbatim from the original per-zone blocks.
	// The keeper zone deliberately checks slots for BOTH teams and does not
	// branch on mode — that is how it behaved before.
	let visible = $derived.by(() => {
		if (isKeeperZone) return teamSlots.length > 0 || opponentSlots.length > 0;
		if (isSelect) return hasZoneInFormation(zone, team);
		return Boolean(displayData?.teamPlayers?.length || displayData?.opponentPlayers?.length);
	});
</script>

{#if visible}
	<div
		class="zone"
		style="left: {layout.left}; top: {layout.top}; z-index: {zIndex};"
	>
		{#if isSelect}
			{#each teamSlots as slot, i (slot.currentPosition + '-' + i)}
				<FormationPlayer
					player={slot.player}
					currentPosition={slot.currentPosition}
					{zone}
					hide={focusedZone !== zone && dropdownActive}
				/>
			{/each}
		{:else if isKeeperZone}
			<!-- Keeper preview renders raw slots, gated on direct-comparison mode -->
			<div class="zone-players-container">
				{#if teamSlots.length > 0 && opponentMode === 0}
					<div class="player-row">
						{#each teamSlots as slot, i (slot.currentPosition + '-' + i)}
							<PlayerMini player={slot.player} showPopup={true} borderCode={1} />
						{/each}
					</div>
				{/if}

				{#if viewOpponent && opponentSlots.length > 0 && opponentMode === 0}
					<div class="player-row">
						{#each opponentSlots as slot, i ('opponent-' + slot.currentPosition + '-' + i)}
							<PlayerMini player={slot.player} showPopup={true} borderCode={2} />
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="zone-players-container">
				{#if displayData.teamPlayers.length > 0}
					<div class="player-row">
						{#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
							<PlayerMini player={slot.player} showPopup={true} borderCode={1} />
						{/each}
					</div>
				{/if}

				{#if viewOpponent && displayData.opponentPlayers.length > 0}
					<div class="player-row">
						{#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
							<PlayerMini player={slot.player} showPopup={true} borderCode={2} />
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.zone {
		position: absolute;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 5.5rem;
	}

	.zone > :global(*) {
		pointer-events: auto;
	}

	.zone-players-container {
		display: flex;
		flex-direction: column;
		gap: 1.6rem;
	}

	.player-row {
		display: flex;
		flex-direction: row;
		gap: 1.2rem;
		justify-content: center;
	}
</style>