<script>
  import { onMount } from "svelte";
  import TeamHeader from "$lib/TeamHeader.svelte";
  import TeamScores from "$lib/TeamScores.svelte";
  import Formation from "$lib/Formation.svelte";
  import { formationConfig } from "$lib/data/formationConfig";
  import SelectedList from "$lib/SelectedList.svelte";
  import { createFormationStructure } from "$lib/utils/utils.js";

  let { data } = $props();

  onMount(() => {
    // prepare structure and then fill positions
    data.team.selected = createFormationStructure(data.team.formation);
    populateLineup(data.team);
    console.log("FINAL selected:", data.team.selected);
  });

  function populateLineup(team) {
    const selected = team.selected;
    const usedIds = new Set();

    // 1) gather all players from all groups
    const allPlayers = Object.keys(selected).flatMap((g) => team[g] || []);

    // 2) find an exact match by detailed_position not yet used
    const getAvailablePlayer = (players, detailedPosition) =>
      players.find((p) => p.detailed_position === detailedPosition && !usedIds.has(p.id));

    // 3) map of fallback positions
    const fallbackOrder = {
      "Centre Forward": ["Left Wing", "Right Wing"],
      "Left Wing": ["Right Wing","Centre Forward"],
      "Right Wing": ["Left Wing","Centre Forward"],
      "Left-Mid": ["Left Wing", "Central Midfield", "Centre Forward"],
      "Right-Mid": ["Right Wing", "Central Midfield", "Centre Forward"],
      "Central Midfield": ["Attacking Midfield", "Defensive Midfield"],
      "Attacking Midfield": ["Central Midfield", "Left Wing", "Right Wing", "Centre Forward"],
      "Defensive Midfield": ["Centre Back", "Central Midfield", "Left Back", "Right Back"],
      "Centre Back": ["Left Back", "Right Back"],
      "Left Back": ["Right Back","Centre Back"],
      "Right Back": ["Left Back","Centre Back"]
    };

    // 4) find a fallback player from allPlayers
    const getFallbackPlayer = (pos) => {
      for (const alt of fallbackOrder[pos] || []) {
        const player = getAvailablePlayer(allPlayers, alt);
        if (player) return player;
      }
      return null;
    };

    // 5) fill each position up to its max
    for (const group of Object.keys(selected)) {
      const groupPlayers = team[group] || [];
      for (const pos in selected[group]) {
        const { max } = selected[group][pos];
        const picked = [];
        for (let i = 0; i < max; i++) {
          // try exact match first
          const exact = getAvailablePlayer(groupPlayers, pos);
          if (exact) {
            picked.push(exact);
            usedIds.add(exact.id);
            continue;
          }
          // then try fallback from any group
          const fb = getFallbackPlayer(pos);
          if (fb) {
            picked.push(fb);
            usedIds.add(fb.id);
          }
        }
        selected[group][pos].players = picked;
      }
    }
    team.unused = allPlayers.filter((p) => !usedIds.has(p.id));
  }

  
</script>
<div class="page-container">
  <div>
      <TeamHeader team={data.team} computer={true} />
  </div>
  <div>
      <TeamScores scores={data.team.scores} playerCount={data.team.playerCount} keeperCount={data.team.keepers.length}/>
  </div>

  <div class="middle-section">
      <Formation team={data.team} />
      <SelectedList team={data.team}/>
  </div>

</div>

<style>
  .middle-section {
      display: flex;
  }
</style>