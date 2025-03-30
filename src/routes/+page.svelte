<script>
    import axios from 'axios';
    import '../app.css';
    import { allPlayers } from '$lib/stores/generic.svelte';
    import {
      generateClubName,
      assignDraftOrder,
      organizeDraftOrder,
      generateClubTraits,
      playerName,
    } from '$lib/utils/utils';
    import { teams, playerTeam } from '$lib/stores/teams.svelte';
    import { getSetDraft, draft } from '$lib/stores/draft.svelte';
    import { firstParts, secondParts, commonNames } from '$lib/data/rngClubNames';
    import DraftPlayer from '$lib/DraftPlayer.svelte';
    import DraftTicker from '$lib/DraftTicker.svelte';
    import PlayerDraftTeam from '$lib/PlayerDraftTeam.svelte';
    import DraftTeam from '$lib/DraftTeam.svelte';
    import { countryMap, getCountry } from '$lib/data/countries';
    import { supabase } from '$lib/supabase/supaClient';
  
    // Local Draft Variables
    const localDraftState = getSetDraft();
    let numberPool = $state(Array.from({ length: 14 }, (_, i) => i + 1));
    let selectedNames = $state({});
    let clubsWithRivals = $state({});
  
    // Caching getTraitEffects
    const traitEffectsCache = new Map();
  
    const getTraitEffects = (traits = []) => {
      const traitsKey = JSON.stringify(traits.sort());
      if (traitEffectsCache.has(traitsKey)) {
        return traitEffectsCache.get(traitsKey);
      }
  
      const traitSet = new Set(traits);
      const effects = {
        defensive: traitSet.has('Favors Defense'),
        attacking: traitSet.has('Favors Attacking'),
        passing: traitSet.has('Strong Passing'),
        pressure: traitSet.has('High Pressure'),
        wingPlay: traitSet.has('Wing Play'),
        aggressive: traitSet.has('Aggressive Tackling'),
        youth: traitSet.has('Youth Focus'),
        experience: traitSet.has('Favors Experience'),
        teamwork: traitSet.has('Teamwork Focus'),
        setPiece: traitSet.has('Set Piece Specialists'),
      };
  
      traitEffectsCache.set(traitsKey, effects);
      return effects;
    };
  
    async function getPlayerById(id) {
      let { data: row, error } = await supabase
        .from('prem_stats_2425')
        .select('*')
        .eq('id', id)
        .single();
  
      if (error) {
        console.error(error);
      } else {
        console.log(row);
      }
    }
  
    async function getPremPlayersFromMini() {
      let { data: players, error } = await supabase
        .from('prem_mini_2425')
        .select('*')
        .order('transfer_value', { ascending: false });
  
      if (error) {
        console.error(error);
      }
  
      for (const player of players) {
        allPlayers.push(player);
      }
  
      console.log(allPlayers);
      localDraftState.setGate0(true);
    }
  
    async function getPremPlayers() {
      let lads = [];
      try {
        const premRes = await axios.get('/api/teams/seasons/23614', {
          params: {
            include: 'players.player.detailedPosition;players.player.position',
          },
        });
        lads = premRes.data.data;
        console.log(lads);
        console.log(`Lads total: ${lads.length}`);
        for (const team of lads) {
          if (team.players && team.players.length > 0) {
            for (const player of team.players) {
              if (player.player.date_of_birth !== null) {
                const position = player.player.position.name;
                let dPosition = null;
                if (player.player.detailedposition && player.player.detailedposition.name) {
                  dPosition = player.player.detailedposition.name;
                }
                const nation = await getCountry(player.player.country_id);
                allPlayers.push({
                  ...player.player,
                  position: position,
                  detailedPosition: dPosition,
                  nationality: nation,
                  team_name: team.name,
                });
              }
            }
          }
        }
        console.log(allPlayers);
      } catch (err) {
        console.error(err);
      }
    }
  
    function draftSetup() {
      playerTeam.name = playerName();
      for (let i = 1; i <= 13; i++) {
        const { name, sameCity, firstName } = generateClubName(firstParts, commonNames, secondParts);
        teams[`team${i}`].name = name;
        if (!selectedNames[firstName]) {
          selectedNames[firstName] = { name: name, index: i };
        }
        teams[`team${i}`].traits = generateClubTraits();
        teams[`team${i}`].draftOrder = assignDraftOrder(numberPool);
        if (sameCity) {
          assignRivals(firstName, true, i);
        }
      }
  
      for (let i = 14; i > 0; i--) {
        if ((clubsWithRivals[i] || []).length < 2) {
          assignRivals('', false, i);
        }
      }
  
      playerTeam.draftOrder = assignDraftOrder(numberPool);
      localDraftState.setOrderList(organizeDraftOrder(playerTeam, teams));
      localDraftState.setGate1(true);
    }
  
    function assignRivals(firstName, bool, index) {
      clubsWithRivals[index] = clubsWithRivals[index] || [];
  
      if (clubsWithRivals[index].length >= 2) return;
  
      if (bool === true) {
        if (selectedNames[firstName]) {
          const foundRival = selectedNames[firstName];
  
          teams[`team${index}`].rivals.push({
            name: foundRival.name,
            index: foundRival.index,
          });
          clubsWithRivals[index].push(foundRival.index);
  
          teams[`team${foundRival.index}`].rivals.push({
            name: teams[`team${index}`].name,
            index: index,
          });
          clubsWithRivals[foundRival.index] = clubsWithRivals[foundRival.index] || [];
          clubsWithRivals[foundRival.index].push(index);
        }
        return;
      }
  
      const attempts = 3;
      for (let i = 0; i < attempts && clubsWithRivals[index].length < 2; i++) {
        const potentialRivalIndex = Math.floor(Math.random() * 13) + 1;
  
        if (index === 14) {
          if ((clubsWithRivals[potentialRivalIndex] || []).length <= 1) {
            playerTeam.rivals.push({
              name: teams[`team${potentialRivalIndex}`].name,
              index: potentialRivalIndex,
            });
            teams[`team${potentialRivalIndex}`].rivals.push({
              name: playerTeam.name,
              index: index,
            });
          }
          clubsWithRivals[index].push(potentialRivalIndex);
          clubsWithRivals[potentialRivalIndex] = clubsWithRivals[potentialRivalIndex] || [];
          clubsWithRivals[potentialRivalIndex].push(index);
          return;
        }
  
        if (
          potentialRivalIndex === index ||
          clubsWithRivals[index].includes(potentialRivalIndex) ||
          (clubsWithRivals[potentialRivalIndex] || []).length >= 2
        ) {
          continue;
        }
  
        if (Math.random() < 0.5) {
          teams[`team${index}`].rivals.push({
            name: teams[`team${potentialRivalIndex}`].name,
            index: potentialRivalIndex,
          });
          teams[`team${potentialRivalIndex}`].rivals.push({
            name: teams[`team${index}`].name,
            index: index,
          });
  
          clubsWithRivals[index].push(potentialRivalIndex);
          clubsWithRivals[potentialRivalIndex] = clubsWithRivals[potentialRivalIndex] || [];
          clubsWithRivals[potentialRivalIndex].push(index);
        }
      }
    }
  
    function beginDraft() {
      if (!draft.started) {
        draft.started = true;
        draft.currentRound = 1;
        draft.currentPick = 1;
  
        let currPick = draft.orderList[0];
        let nextPick = draft.orderList[1];
  
        draft.currentTeam = currPick.id === 'player' ? playerTeam.name : currPick.name;
        console.log('currentTeam: ', draft.currentTeam);
        draft.nextTeam = nextPick.id === 'player' ? playerTeam.name : nextPick.name;
      }
    }
  
    function handleAIPick(teamId) {
      executePick(teamId, false);
    }
  
    function executePick(teamId, isPlayer) {
      const pickingTeam = teamId === 'player' ? playerTeam : teams[teamId];
      const traits = pickingTeam.traits || [];
  
      if (!isPlayer) {
        const affordablePlayers = draft.availablePlayers.filter(
          (p) => p.transfer_value <= pickingTeam.transferBudget
        );
  
        if (affordablePlayers.length < 1) {
          console.log('No affordable players available');
          return false;
        }
      }
  
      const positionScores = getPositionalNeeds(pickingTeam, traits);
    }
  
    function getPositionalNeeds(team, traits) {
      const positions = {
        goalkeeper: team.keepers.length,
        defender: team.defenders.length,
        midfielder: team.midfielders.length,
        attacker: team.attackers.length,
      };
  
      const posTargets = {
        goalkeeper: 2,
        defender: 6,
        midfielder: 6,
        attacker: 4,
      };
  
      const allTargetsMet = Object.entries(posTargets).every(([pos, target]) => positions[pos] >= target);
  
      if (allTargetsMet) {
        return {
          goalkeeper: 1,
          defender: 1,
          midfielder: 1,
          attacker: 1,
        };
      }
  
      const traitEffects = getTraitEffects(traits);
  
      const needs = {};
      needs.goalkeeper = positions.goalkeeper >= posTargets.goalkeeper ? -15 : positions.goalkeeper === 0 ? 30 : positions.goalkeeper === 1 ? 2 : 0;
      needs.defender = positions.defender >= posTargets.defender ? -15 : (posTargets.defender - positions.defender) * (traitEffects.defensive ? 3 : 2);
      needs.midfielder = positions.midfielder >= posTargets.midfielder ? -15 : (posTargets.midfielder - positions.midfielder) * 2;
      needs.attacker = positions.attacker >= posTargets.attacker ? -15 : (posTargets.attacker - positions.attacker) * (traitEffects.attacking ? 3 : 2);
  
      return needs;
    }
</script>

<!-- <button onclick={getTeamsList}>Get Teams</button> -->
<button onclick={getPlayerById(539961)}>getPlayerById</button>
<button onclick={getPremPlayersFromMini}>Get Players</button>
<button onclick={getPremPlayers}>Get Players From API</button>


<div class="draft-main-container">
    {#if draft.gate1}
    <div class="draft-ticker-container">
        <DraftTicker ticker={draft}/>
    </div>
    {/if}
    {#if draft.gate0 && !draft.gate1}
    <div class="create-teams-btn">
        <button 
            onclick={draftSetup}
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
        >
            Create Teams and Prepare Draft
        </button>
    </div>
    {/if}
    {#if draft.gate1}
    <div class="start-draft-btn">
        <button 
            onclick={beginDraft}
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
        >
            Start Draft
        </button>
    </div>
    {/if}
    
    
    {#if draft.started}
        {#if draft.currentTeam !== playerTeam.name}
            <div class="draft-buttons">
                <!-- {draft.currPick.id}
                {draft.currPick.name} -->
                <button 
                    onclick={() => handleAIPick(draft.orderList[(draft.currentRound - 1) * 14 +(draft.currentPick -1)].id)} 
                    class="advance-btn">Advance Draft
                </button>
                <button 
                   
                    class="skip-btn">Skip to Next Player Pick
                </button>
            </div>
        {/if}
    {/if}
</div>

<div class="page-container">
	<div class="players-section">
		<h3>Prem Players: {allPlayers.length}</h3>
		<div class="player-list">
			{#each allPlayers as player}
				<DraftPlayer player={player} />
			{/each}
		</div>
	</div> 
    {#if draft.gate1}
    <div class="player-team-section">
        <PlayerDraftTeam team={playerTeam}/>
    </div>
    <div class="ai-teams-section">
        <div class="teams-grid">
            {#each Object.entries(teams)
                .sort(([,a],[,b])=> a.draftOrder - b.draftOrder) as [key, team]}
                <DraftTeam team={team} />
            {/each}
        </div>
    </div>
    {/if}
 </div>

<style>
    button {
        background-color: blue;
        color: white;
        padding: 1rem;
        margin-bottom: 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
    }

    button:hover {
        background-color: darkblue;
    }

    .page-container {
        display: flex;
        width: 100%;
        max-width: 2000px;
        margin: 0 auto;
        gap: 2rem;
        padding: 1rem;
        height: calc(100vh - 180px);
    }

    .players-section {
        flex: 0 0 40%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .player-list {
        flex: 1;
        overflow-y: auto;
        padding-right: 0.5rem;
    }

    .player-team-section {
        flex: 0 0 30%; 
    }

    .ai-teams-section {
        flex: 0 0 30%; 
        background-color: #f8fafc; 
    }

    h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e293b;
    }
</style>