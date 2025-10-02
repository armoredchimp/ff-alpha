<script lang="ts">
    import Formation from "$lib/Formation.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import { getOpponentTeam } from "$lib/utils/team";
    import type { PageData } from './$types';
    
    let { data }: { data: PageData } = $props();
    
    let opponentMode = $state(0); // 0 = Comparison, 1 = Matchup
    let tabDisplay = $state(0); // 0 = Pos Groups, 1 = Zonal
    
    // Get the opponent team
    const opponent = getOpponentTeam(data.team?.nextOpponentID);
</script>

{#if data.team}
    <div class="matchup-container">
        <div class="team-header">
            <TeamHeader team={data.team} computer={true} />
        </div>
        
        {#if opponent}
            <div class="vs-indicator">
                <h2>{data.team.name} vs {opponent.name}</h2>
            </div>
        {:else}
            <div class="vs-indicator">
                <h2>No opponent scheduled</h2>
            </div>
        {/if}
        
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
                    team={data.team}
                    base={false}
                    {opponent}
                    viewOpponent={true}
                    {opponentMode}
                    {tabDisplay}
                    zonesVisible={tabDisplay === 1}
                />
            </div>
        {/key}
    </div>
{:else}
    <p>Team not found</p>
{/if}

<style>
    .matchup-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        margin-bottom: 10rem;
    }
    
    .team-header {
        margin-bottom: 1rem;
    }
    
    .vs-indicator {
        text-align: center;
        padding: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .vs-indicator h2 {
        margin: 0;
        font-size: 1.5rem;
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