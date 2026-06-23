<script lang="ts">
    import { clubsByID } from '$lib/stores/generic.svelte';
    import type { Player } from '$lib/types/types';

    let { players, onConfirm, onCancel } = $props<{
        players: Player[];                              // qualifying players (2+ fixtures)
        onConfirm: (favored: Record<number, number>) => void;
        onCancel: () => void;
    }>();

    // local selection state: playerId -> chosen fixture_id
    let picks = $state<Record<number, number | null>>(
        Object.fromEntries(players.map((p: Player) => [p.id, null]))
    );

    // every player must have a pick before confirm is allowed
    let allPicked = $derived(players.every((p: Player) => picks[p.id] != null));

    function clubName(teamId: number): string {
        return clubsByID[teamId] ?? `Team ${teamId}`;
    }

    function fmtFixture(fx: any): string {
        const opp = clubName(fx.opponent_team_id);
        const venue = fx.is_home ? 'H' : 'A';
        let when = '';
        if (fx.kickoff) {
            const d = new Date(fx.kickoff);
            when = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        }
        return `vs ${opp} (${venue})${when ? ' · ' + when : ''}`;
    }

    function pick(playerId: number, fixtureId: number) {
        picks[playerId] = fixtureId;
    }

    function confirm() {
        if (!allPicked) return;
        // narrow to Record<number, number> now that all are picked
        onConfirm(picks as Record<number, number>);
    }
</script>

<div class="overlay" role="dialog" aria-modal="true">
    <div class="modal">
        <h2>Choose favored fixture</h2>
        <p class="sub">
            These players have two matches this gameweek. Pick which one counts at full
            weight — the other is scored at a reduced rate.
        </p>

        <div class="players">
            {#each players as player (player.id)}
                <div class="player-row">
                    <div class="player-name">{player.player_name}</div>
                    <div class="fixtures">
                        {#each player.upcomingFixtures ?? [] as fx (fx.fixture_id)}
                            <button
                                class="fixture-option"
                                class:selected={picks[player.id] === fx.fixture_id}
                                onclick={() => pick(player.id, fx.fixture_id)}
                            >
                                {fmtFixture(fx)}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <div class="actions">
            <button class="cancel" onclick={onCancel}>Cancel</button>
            <button class="confirm" disabled={!allPicked} onclick={confirm}>
                {allPicked ? 'Confirm & Upload' : 'Pick all to continue'}
            </button>
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 2000;
    }
    .modal {
        background: #fff;
        border-radius: 10px;
        padding: 1.5rem;
        width: min(520px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h2 { margin: 0 0 0.25rem; font-size: 1.2rem; color: #1a1a1a; }
    .sub { margin: 0 0 1.25rem; font-size: 0.85rem; color: #666; line-height: 1.4; }
    .players { display: flex; flex-direction: column; gap: 1rem; }
    .player-row {
        display: flex; flex-direction: column; gap: 0.5rem;
        padding-bottom: 1rem; border-bottom: 1px solid #eee;
    }
    .player-row:last-child { border-bottom: none; padding-bottom: 0; }
    .player-name { font-weight: 600; font-size: 0.95rem; color: #222; }
    .fixtures { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .fixture-option {
        flex: 1; min-width: 180px;
        padding: 0.6rem 0.8rem;
        border: 1px solid #ccc; border-radius: 6px;
        background: #fafafa; color: #333;
        font-size: 0.85rem; text-align: left; cursor: pointer;
        transition: all 0.15s;
    }
    .fixture-option:hover { border-color: #888; }
    .fixture-option.selected {
        border-color: #0070f3; background: #e8f1ff; color: #0050b3; font-weight: 600;
    }
    .actions {
        display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;
    }
    .actions button {
        padding: 0.55rem 1.1rem; border-radius: 6px; font-size: 0.9rem;
        font-weight: 500; cursor: pointer; border: none;
    }
    .cancel { background: #eee; color: #444; }
    .cancel:hover { background: #ddd; }
    .confirm { background: #0070f3; color: #fff; }
    .confirm:hover:not(:disabled) { background: #005bb5; }
    .confirm:disabled { background: #ccc; cursor: not-allowed; }
</style>