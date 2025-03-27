<script>
	import axios from "axios";
	import '../app.css';
	import { allPlayers } from "$lib/stores/generic.svelte";
    import { generateClubName, assignDraftOrder, organizeDraftOrder, generateClubTraits, playerName } from "$lib/utils/utils";
    import { teams, playerTeam } from "$lib/stores/teams.svelte";
    import { getSetDraft, draft } from "$lib/stores/draft.svelte";
    import { firstParts, secondParts, commonNames } from "$lib/data/rngClubNames";
	import DraftPlayer from "$lib/DraftPlayer.svelte";
    import DraftTicker from "$lib/DraftTicker.svelte";
    import PlayerDraftTeam from "$lib/PlayerDraftTeam.svelte";
    import DraftTeam from "$lib/DraftTeam.svelte";
	import { countryMap, getCountry } from '$lib/data/countries';
    import { supabase } from "$lib/supabase/supaClient";
	

    //Local Draft Variables//
    const localDraftState = getSetDraft()
    let numberPool = $state(Array.from({length:14}, (_,i) => i+1))
    let selectedNames = $state({})
    let clubsWithRivals = $state({})

    async function getPlayerById(id){
        let { data: row, error } = await supabase
        .from('prem_stats_2425')
        .select('*')
        .eq('id', id)
        .single()

        if(error){
            console.error(error)
        }else{
            console.log(row)
        }
    }


    async function getPremPlayersFromMini(){
        let { data: players, error } = await supabase
            .from('prem_mini_2425')
            .select('*')
            .order('transfer_value', { ascending: false });

        if (error){
            console.error(error)
        }

        for(const player of players){
            // console.log(`Processing player ${player.player_name}`)
            allPlayers.push(player)
        }
    
        console.log(allPlayers)
        localDraftState.setGate0(true)
    }


	async function getPremPlayers() {
        let lads = []
        try {
            const premRes = await axios.get('/api/teams/seasons/23614', {
                params: {
                    include: 'players.player.detailedPosition;players.player.position' 
                }
        });
            lads = premRes.data.data;
            console.log(lads)
            console.log(`Lads total: ${lads.length}`)
            for (const team of lads) {
                if (team.players && team.players.length > 0) {
                    for (const player of team.players) {
                        if (player.player.date_of_birth !== null) {
                            const position = player.player.position.name;
                            let dPosition = null;
                            if(player.player.detailedposition && player.player.detailedposition.name){
                                dPosition = player.player.detailedposition.name
                            }
                            const nation = await getCountry(player.player.country_id);	
                            allPlayers.push({
                                ...player.player,
                                position: position,
                                detailedPosition: dPosition,
                                nationality: nation,
                                team_name: team.name
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
        for(let i = 1; i <= 13; i++) {
            const { name, sameCity, firstName } = generateClubName(firstParts, commonNames, secondParts);
            teams[`team${i}`].name = name;
            if (!selectedNames[firstName]){
                selectedNames[firstName] = { name: name, index: i }
            }
            teams[`team${i}`].traits = generateClubTraits();
            teams[`team${i}`].draftOrder = assignDraftOrder(numberPool);
            if (sameCity){
                assignRivals(firstName, true, i)
            }
        }
        
        // Second pass for random rivals only after all names exist
        for(let i = 1; i <= 13; i++) {
            if ((clubsWithRivals[i] || []).length < 2) {
                assignRivals('', false, i)
            }
        }

        playerTeam.draftOrder = assignDraftOrder(numberPool);
        playerTeam.name = playerName()
        localDraftState.setOrderList(organizeDraftOrder(playerTeam, teams))
        localDraftState.setGate1(true)
    }

    function assignRivals(firstName, bool, index) {
        // Initialize if needed
        teams[`team${index}`].rivals = teams[`team${index}`].rivals || [];
        clubsWithRivals[index] = clubsWithRivals[index] || [];
        
        // Strict limit - never exceed 2 rivals
        if (clubsWithRivals[index].length >= 2) return;

        // Original same-city logic (working version)
        if (bool === true) {
            if (selectedNames[firstName]) {
                const foundRival = selectedNames[firstName];
                
                // Only proceed if both teams have room
                if (clubsWithRivals[index].length < 2 && 
                    (clubsWithRivals[foundRival.index] || []).length < 2) {
                    
                    teams[`team${index}`].rivals.push({ 
                        name: foundRival.name, 
                        index: foundRival.index 
                    });
                    clubsWithRivals[index].push(foundRival.index);
                    
                    teams[`team${foundRival.index}`].rivals.push({ 
                        name: teams[`team${index}`].name, 
                        index: index 
                    });
                    clubsWithRivals[foundRival.index] = clubsWithRivals[foundRival.index] || [];
                    clubsWithRivals[foundRival.index].push(index);
                }
            }
            return; // Same-city handled separately
        }

        // Random rivals (only if we have room)
        const attempts = 3;
        for (let i = 0; i < attempts && clubsWithRivals[index].length < 2; i++) {
            const potentialRivalIndex = Math.floor(Math.random() * 13) + 1;
            
            // Skip invalid cases
            if (potentialRivalIndex === index || 
                clubsWithRivals[index].includes(potentialRivalIndex) ||
                (clubsWithRivals[potentialRivalIndex] || []).length >= 2) {
                continue;
            }

            if (Math.random() < 0.5) {
                // Add both directions
                teams[`team${index}`].rivals.push({
                    name: teams[`team${potentialRivalIndex}`].name,
                    index: potentialRivalIndex
                });
                teams[`team${potentialRivalIndex}`].rivals.push({
                    name: teams[`team${index}`].name,
                    index: index
                });
                
                // Update tracking
                clubsWithRivals[index].push(potentialRivalIndex);
                clubsWithRivals[potentialRivalIndex] = clubsWithRivals[potentialRivalIndex] || [];
                clubsWithRivals[potentialRivalIndex].push(index);
            }
        }
    }

</script>

<!-- <button onclick={getTeamsList}>Get Teams</button> -->
<button onclick={getPlayerById(539961)}>getPlayerById</button>
<button onclick={getPremPlayersFromMini}>Get Players</button>
<button onclick={getPremPlayers}>Get Players From API</button>


<div class="draft-main-container">
    <div class="draft-ticker-container">
        <DraftTicker ticker={draft}/>
    </div>
    {#if draft.gate0}
    <div class="create-teams-btn">
        <button 
            onclick={draftSetup}
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
        >
            Create Teams and Prepare Draft
        </button>
    </div>
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