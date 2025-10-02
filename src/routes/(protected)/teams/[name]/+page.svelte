<script lang="ts">
  import TeamHeader from "$lib/TeamHeader.svelte";
  import TeamScores from "$lib/TeamScores.svelte";
  import Formation from "$lib/Formation.svelte";
  import SelectedList from "$lib/SelectedList.svelte";
  import { getOpponentName } from "$lib/utils/team";
  import { afterNavigate } from '$app/navigation';
  import type { Team } from '$lib/types/types';
  import type { PageData } from './$types';
	import { calculateTotalScores, recalculateSectionScores } from "$lib/utils/team";

  let { data }: { data: PageData & { team: Team } } = $props();
    
  afterNavigate(() => {
    calculateTotalScores(data.team)
    recalculateSectionScores(data.team)
    console.log("FINAL selected:", data.team.selected);
  });
</script>

<div class="page-container">
  <div class="top-buttons">
    <button><a href="/teams/{data.team.name.toLowerCase()}/matchup">Matchup</a></button>
  </div>
  <div>
    <TeamHeader team={data.team} computer={true} />
  </div>
  <h1>Next Opponent: {getOpponentName(data.team.nextOpponentID)}</h1>
  <div>
    <TeamScores 
      scores={data.team.scores.total} 
      playerCount={data.team.playerCount} 
      keeperCount={data.team.keepers.length}
    />
  </div>
  <div class="middle-section">
    <Formation team={data.team} />
    <SelectedList team={data.team}/>
  </div>
</div>

<style>
  .top-buttons {
      display: flex;
      margin-top: 2rem;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
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
  
  button:disabled {
      background: #ccc;
      cursor: not-allowed;
  }

  .middle-section {
    display: flex;
  }
</style>