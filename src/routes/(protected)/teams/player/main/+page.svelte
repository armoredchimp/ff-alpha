<script lang="ts">
    import { playerTeam } from "$lib/stores/teams.svelte";
    import Formation from "$lib/Formation.svelte";
    import { formationConfig } from "$lib/data/formationConfig";
    import SelectedList from "$lib/SelectedList.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
    import { onMount } from "svelte";
    import { createFormationStructure, resetScores, populateLineup, delay } from "$lib/utils";
    import { calculateTotalScores } from "../../../../../lib/utils";
    import type { Team } from "$lib/types/types";
   
    // Key for #key to force formation to re-render and all its child components
    let formationKey = $state<number>(0);

    onMount(() => {
        calculateTotalScores(playerTeam as Team)
       
        if(playerTeam.selected.length < 1){
            playerTeam.selected = createFormationStructure(playerTeam.formation)
        }
        delay(100)
        populateLineup(playerTeam as Team)
        
        console.log(playerTeam)
       
        // Listen for player swap events from FormationPlayer components
        const handlePlayerSwap = (): void => {
            console.log('player swap event')
            formationKey++;
        };
        document.addEventListener('playerSwapped', handlePlayerSwap);
       
        // Cleanup listener on component destroy
        return () => {
            document.removeEventListener('playerSwapped', handlePlayerSwap);
        };
    })
    
    function formationChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        playerTeam.formation = target.value;
        resetScores(playerTeam as Team)
        playerTeam.selected = createFormationStructure(playerTeam.formation)
        formationKey++;
    }
    
    function autoPick(): void {
        populateLineup(playerTeam as Team)
        formationKey++
    }
</script>

<div class="page-container">
    <div>
        <TeamHeader team={playerTeam} computer={false} />
    </div>
    <div>
        <TeamScores
            scores={playerTeam.scores.total}
            playerCount={playerTeam.playerCount}
            keeperCount={playerTeam.keepers.length}
        />
    </div>
    <div class="middle-section">
        <div class="dropdown-wrapper">
            <select
                bind:value={playerTeam.formation}
                onchange={(e) => formationChange(e)}
            >
                {#each Object.keys(formationConfig) as f}
                    <option value={f}>{f}</option>
                {/each}
            </select>
        </div>
        <button onclick={() => autoPick()}>Auto-Pick Team</button>
       
        <div class="content-wrapper">
            {#key formationKey}
                <Formation team={playerTeam} />
                <SelectedList team={playerTeam} />
            {/key}
        </div>
    </div>
</div>

<style>
    .middle-section {
        display: flex;
        flex-direction: column;  
        gap: 1.5rem;              
        padding: 1rem 0;        
        overflow: visible;      
    }
 
    .dropdown-wrapper {
        position: relative;
        z-index: 1000;
        overflow: visible;
        margin-left: 1rem;        
    }
 
    select {
        position: relative;
        z-index: 1001;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fafafa;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    
    select:hover {
        border-color: #888;
    }
 
    button {
        align-self: center;    
        margin-left: 0;
        padding: 0.5rem 1.2rem;
        font-size: 1rem;
        font-weight: 500;
        color: #fff;
        background: #0070f3;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
    }
    
    button:hover {
        background: #005bb5;
    }
    
    button:active {
        transform: scale(0.98);
    }
 
    .content-wrapper {
        display: flex;
        gap: 1rem;
        position: relative;
        overflow: visible;
    }
</style>