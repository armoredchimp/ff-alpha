<script lang="ts">
    import { supabaseScaling } from "./client/supabase/supaClient";
    import { teamIdsToName } from "./stores/generic.svelte";
	import type { Team } from "./types/types";
	

    let {
        details = {} as JSON,
        isHome = false as boolean,
        team = {} as Team,
    } = $props<{
        details?: JSON;
        isHome?: boolean;
        team?: Team | null;
    }>();

    let teamSide = $derived(isHome ? 'home' : 'away');
    let oppSide = $derived(isHome ? 'away' : 'home');

    let teamGoals = $derived(details.goal_details?.[teamSide] || []);
    let oppGoals = $derived(details.goal_details?.[oppSide] || []);

    let oppName = $derived(teamIdsToName[team.lastResult.oppId] || 'Opponent');
</script>

<div class="match-container">
  <div class="score-header">
    <div class="team-name ours">{team.name}</div>
    <div class="score">
      {team.lastResult.goalsFor} - {team.lastResult.goalsAgainst}
    </div>
    <div class="team-name theirs">{oppName}</div>
  </div>

  <div class="goals-section">
    {#if teamGoals.length > 0}
      <div class="goals-column ours">
        {#each teamGoals as goal}
          <div class="goal-entry">
            <span class="minute">{goal.minute}'</span>
            <span class="scorer">{goal.scorerName}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="goals-column ours empty">No goals</div>
    {/if}

    {#if oppGoals.length > 0}
      <div class="goals-column theirs">
        {#each oppGoals as goal}
          <div class="goal-entry">
            <span class="scorer">{goal.scorerName}</span>
            <span class="minute">{goal.minute}'</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="goals-column theirs empty">No goals</div>
    {/if}
  </div>
</div>

<style>
  .match-container {
    max-width: 500px;
    margin: 1rem auto;
    padding: 1.5rem;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 1rem;
  }

  .team-name {
    font-weight: 600;
    font-size: 1.1rem;
    flex: 1;
  }

  .team-name.ours { 
    text-align: left; 
    color: #2563eb; 
  }

  .team-name.theirs { 
    text-align: right; 
    color: #dc2626; 
  }

  .score {
    font-size: 1.75rem;
    font-weight: 700;
    padding: 0 1.5rem;
  }

  .goals-section {
    display: flex;
    gap: 1rem;
  }

  .goals-column {
    flex: 1;
  }

  .goals-column.theirs {
    text-align: right;
  }

  .goals-column.empty {
    color: #a0aec0;
    font-style: italic;
    padding: 0.5rem 0;
  }

  .goal-entry {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0;
  }

  .goals-column.theirs .goal-entry {
    justify-content: flex-end;
  }

  .minute {
    font-weight: 600;
    color: #718096;
    font-size: 0.85rem;
    min-width: 2rem;
  }

  .scorer {
    font-weight: 500;
  }

  .goals-column.ours .scorer { color: #2563eb; }
  .goals-column.theirs .scorer { color: #dc2626; }
</style>