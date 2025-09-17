<script lang="ts">
    import Formation from "$lib/Formation.svelte";
    import { teams, playerTeam } from "$lib/stores/teams.svelte";
    
    let opponentMode = $state(0); // 0 = Comparison, 1 = Matchup
    let tabDisplay = $state(0); //0 = Pos Groups, 1 = Zonal
</script>

<div class="formation-container">
    <div class="controls">
        <label class="mode-toggle">
            <span>View Mode:</span>
            <select bind:value={tabDisplay}>
                <option value={0}>Positional Groups</option>
                <option value={1}>Zones</option>
            </select>
        </label>
        <label class="mode-toggle">
            <span>Opponent View:</span>
            <select bind:value={opponentMode}>
                <option value={0}>Comparison View</option>
                <option value={1}>Matchup View</option>
            </select>
        </label>
    </div>
    
    {#key opponentMode || tabDisplay}
        <div class="formation-wrapper">
            <Formation 
                team={playerTeam} 
                base={false} 
                opponent={teams.team2} 
                viewOpponent={true} 
                {opponentMode}
                {tabDisplay}
            />
        </div>
    {/key}
</div>

<style>
    .formation-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        margin-bottom: 10rem;
    }
    
    .controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 5rem;
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 8px;
    }
    
    .mode-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }
    
    .mode-toggle select {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 1rem;
    }
    
    .mode-toggle select:hover {
        border-color: #888;
    }
    
    .mode-toggle select:focus {
        outline: none;
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    }
    
    .formation-wrapper {
        display: flex;
        justify-content: left;
    }
</style>