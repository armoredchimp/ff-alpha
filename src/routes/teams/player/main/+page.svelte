<script>
    import { playerTeam, teams } from "$lib/stores/teams.svelte";
    import Formation from "$lib/Formation.svelte";
    import { formationConfig } from "$lib/data/formationConfig";
    import SelectedList from "$lib/SelectedList.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
	import { onMount } from "svelte";
    import { createFormationStructure, populateLineup } from "$lib/utils/utils";


    onMount(()=>{
        if(playerTeam.selected.length <1){
            playerTeam.selected = createFormationStructure(playerTeam.formation)
        }
    })

    function formationChange(e){
        playerTeam.formation = e.target.value;
        playerTeam.selected = createFormationStructure(playerTeam.formation)
    }

</script>

<div class="page-container">
    <div>
        <TeamHeader team={playerTeam} computer={false} />
    </div>
    <div>
        <TeamScores
            scores={playerTeam.scores}
            playerCount={playerTeam.playerCount}
            keeperCount={playerTeam.keepers.length}
        />
    </div>

    <div class="middle-section">
        <div class="dropdown-wrapper">
            <select
                bind:value={playerTeam.formation}
                onchange={(e) => (formationChange(e))}
            >
                {#each Object.keys(formationConfig) as f}
                    <option value={f}>{f}</option>
                {/each}
            </select>
        </div>

    <button onclick={populateLineup(playerTeam)}>Auto-Pick Team</button>

        <!-- {#key playerFormationToggle.formToggle} -->
            <div class="content-wrapper">
                <Formation team={playerTeam} />
                <SelectedList team={playerTeam} />
            </div>
        <!-- {/key} -->
    </div>
</div>

<style>
    .middle-section {
      display: flex;
      flex-direction: column;   /* stack dropdown + button above content */
      gap: 1.5rem;              /* a bit more breathing room */
      padding: 1rem 0;          /* vertical padding around the controls */
      overflow: visible;        /* allow dropdown to float */
    }
  
    .dropdown-wrapper {
      position: relative;
      z-index: 1000;
      overflow: visible;
      margin-left: 1rem;        /* push it in from the left */
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