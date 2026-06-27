<script>
    import { onMount } from 'svelte';
    import '../../../app.css';
    import { allPlayers } from '$lib/stores/generic.svelte';
    import {
        generateClubName,
        assignDraftOrder,
        organizeDraftOrder,
        generateClubTraits,
        parseTeamIdMap,
        playerName,
        createFormationStructure,
        populateLineup,
        getRandomItem, 
        extractPlayerIds, 
        getPlayerValue,
        getPositionalNeeds
    } from '$lib/utils';
    import { teams, playerTeam } from '$lib/stores/teams.svelte';
    import { draft } from '$lib/stores/draft.svelte';
    import { loadPlayersData } from '$lib/loading/players/loadPlayers';
    import { formationConfig } from '$lib/data/formationConfig';
    import DraftPlayer from '$lib/DraftPlayer.svelte';
    import DraftTicker from '$lib/DraftTicker.svelte';
    import PlayerDraftTeam from '$lib/PlayerDraftTeam.svelte';
    import DraftTeam from '$lib/DraftTeam.svelte';
    import { managers } from "$lib/stores/generic.svelte";
    import { getLeagueState, TABLE_PREFIXES, setLeagueId, getCountry } from '$lib/stores/league.svelte';


    // Props
    const { data } = $props()

    // State Variables
    let halfOfTeams = $derived(draft.totalTeams / 2);
    let numberPool = $state(null);
    let draftUploading = $state(false);
    let draftUploaded = $state(false);
    let selectedNames = $state({});
    let clubsWithRivals = $state({});
    let clubsWithoutMoney = $state({
        total: 0,
        clubNumbers: []
    });
    let firstParts = $state([]);
    let secondParts = $state([]);
    let commonNames = $state([]);
    let leagueState = $state()
    // Caching
    const traitEffectsCache = new Map();

    // Lifecycle
    onMount(async () => {
        if(!draft.loaded){
            console.log('data: ', data)
            leagueState = getLeagueState();
            await loadClubNames(leagueState.countryCode);
            // Check if players are loaded in the store
            if (allPlayers.length > 0) {
                console.log(`Using ${allPlayers.length} pre-loaded players`);
            } else {
                console.log('No players loaded - should only happen right after league creation');
                await loadPlayersData(leagueState.countriesCode);
            }
            draft.gate0 = true
            // Set number of teams
            if (data.numOfTeams && data.numOfTeams > 14) {
                draft.totalTeams = data.numOfTeams
                console.log('total teams value', draft.totalTeams)
            } else if(leagueState.numOfTeams > 14) {
                draft.totalTeams = leagueState.numOfTeams
                
            } else {
                console.log('Condition failed - using default 14');

            }
            
            // Load managers if needed
            if (data.managers && data.managers.length > 0) {
                managers.length = 0;
                for (const manager of data.managers) {
                    managers.push(manager);
                }
                console.log(`Loaded ${data.managers.length} managers`);
            }
            
            numberPool = Array.from({length: draft.totalTeams }, (_, i) => i + 1);
            draft.loaded = true
        }
    });

    async function loadClubNames(countryCode) {
        const prefix = TABLE_PREFIXES[countryCode];
        if (!prefix) {
            console.error('Invalid country code:', countryCode);
            // Fallback to default (prem) if invalid code
            return;
        }
        
        try {
            const module = await import(`$lib/data/${prefix}/rngClubNames.js`);
            firstParts = module.firstParts || [];
            secondParts = module.secondParts || [];
            commonNames = module.commonNames || [];
            console.log(`Loaded club names for ${prefix}`);
        } catch (error) {
            console.error(`Failed to load club names for ${prefix}:`, error);
        }
    }

    $effect(() => {
        if (draft.complete && !draftUploading && !draftUploaded) {
            finalizeAndUploadDraft();
        }
    });

    async function draftSetup() {
        playerTeam.name = playerName();
        console.log('About to create teams, totalTeams:', draft.totalTeams);
        for (let i = 1; i < draft.totalTeams ; i++) {
            console.log('Creating team', i);
            const {
                name,
                sameCity,
                firstName
            } = generateClubName(firstParts, commonNames, secondParts);
            teams[`team${i}`].name = name;
            if (!selectedNames[firstName]) {
                selectedNames[firstName] = {
                    name: name,
                    index: i
                };
            }
            teams[`team${i}`].traits = generateClubTraits();
            teams[`team${i}`].draftOrder = assignDraftOrder(numberPool);
            console.log(`number pool:`, numberPool.length)
            if (managers.length > 0) {
                teams[`team${i}`].manager = getRandomItem(managers)
                if (teams[`team${i}`].manager.preferred_formation !== null) {
                    teams[`team${i}`].formation = teams[`team${i}`].manager.preferred_formation
                }
                // console.log('manager: ', teams[`team${i}`].manager)
            }
            if (sameCity) {
                assignRivals(firstName, true, i);
            }
        }

        for (let i = draft.totalTeams ; i > 0; i--) {
            if ((clubsWithRivals[i] || []).length < 2) {
                assignRivals('', false, i);
            }
        }


        draft.availablePlayers = allPlayers
        playerTeam.draftOrder = assignDraftOrder(numberPool);
        draft.orderList = organizeDraftOrder(playerTeam, teams, draft.totalTeams);
        draft.gate1 = true;

        // Prepare teams data for Supabase insertion
        const teamsToInsert = [];

        
        teamsToInsert.push({
            league_id: leagueState.leagueId,
            team_name: playerTeam.name,
            rivals: playerTeam.rivals || [],
            formation: playerTeam.formation || '4-4-2',
            transfer_budget: 50000,
            player_count: 0,
            frontend_number: 0,
            draft_order: playerTeam.draftOrder
        });

        
        for (let i = 1; i < draft.totalTeams ; i++) {
            const team = teams[`team${i}`];
            teamsToInsert.push({
                league_id: leagueState.leagueId,
                team_name: team.name,
                rivals: team.rivals || [],
                traits: team.traits || [],
                frontend_number: i,
                manager_id: team.manager.id,
                formation: team.formation || '4-4-2',
                transfer_budget: 50000,
                player_count: 0,
                draft_order: team.draftOrder,
            });
        }

        console.log('Teams to insert:', JSON.stringify(teamsToInsert, null, 2));
        
        // Supabase server action
        try {
            const formData = new FormData();
            formData.append('teams', JSON.stringify(teamsToInsert));
            
            const response = await fetch('?/insertTeams', {
                method: 'POST',
                body: formData
            });
            
            const responseText = await response.text();
            console.log('RAW response text:', responseText);

            const result = JSON.parse(responseText);
            console.log('Parsed result:', result);
            
            if (result.type === 'success' && result.data) {
        
                let parsedData = typeof result.data === 'string' 
                    ? JSON.parse(result.data) 
                    : result.data;
                
                console.log('Parsed data:', parsedData);
                
                let teamIdMap = parseTeamIdMap(parsedData)
                
                console.log('Extracted teamIdMap:', teamIdMap);
                
                playerTeam.dbId = teamIdMap["0"];
                console.log('Player team dbId stored:', playerTeam.dbId);
                
                // Store AI team IDs
                for (let i = 1; i < draft.totalTeams; i++) {
                    teams[`team${i}`].dbId = teamIdMap[i.toString()];
                    console.log(`Team ${i} dbId stored:`, teams[`team${i}`].dbId);
                }
                
                console.log('All team IDs stored in frontend state');
        } else {
            console.error('Failed to insert teams:', result.data?.error || 'Unknown error');
            throw new Error(result.data?.error || 'Failed to insert teams');
        }
        } catch (error) {
            console.error('Failed to upload teams to Supabase:', error);
        }
    }

    async function finalizeAndUploadDraft() {
        console.log('Draft completed, finalizing and uploading teams...');
        console.log('Starting with draft.totalTeams:', draft.totalTeams);
        
        draftUploading = true;

        const playerToId = (playerArray) => {
                if (!Array.isArray(playerArray)) return [];
                return playerArray.map(player => player.id);
            };
            
        try {
            // Prepare team players data using stored dbIds
            const teamPlayersData = [];
            
            // Add player team
            console.log('Processing player team...');
            console.log('playerTeam.dbId:', playerTeam.dbId);
            
            if (playerTeam.dbId) {
                const playerTeamData = {
                    team_id: playerTeam.dbId,
                    attackers: playerToId(playerTeam.attackers) || [],
                    midfielders: playerToId(playerTeam.midfielders) || [],
                    defenders: playerToId(playerTeam.defenders) || [],
                    keepers: playerToId(playerTeam.keepers) || [],
                    selected: [], 
                    subs: [], 
                    unused: [] 
                };
                console.log('Player team data prepared:', playerTeamData);
                teamPlayersData.push(playerTeamData);
            } else {
                console.error('Player team missing database ID');
            }
            
            // Add AI teams
            console.log('Processing AI teams...');
            for (let i = 1; i < draft.totalTeams; i++) {
                console.log(`Processing team ${i}...`);
                const team = teams[`team${i}`];
                console.log(`team${i} exists:`, !!team);
                console.log(`team${i}.dbId:`, team?.dbId);
                console.log(`team${i}.formation:`, team?.formation);
                
                team.selected = createFormationStructure(team.formation)
                console.log(`team${i}.selected after createFormationStructure:`, team.selected);
                
                populateLineup(team)
                console.log(`team${i} after populateLineup - selected:`, team.selected?.length, 'subs:', team.subs?.length, 'unused:', team.unused?.length);

                if (team.dbId) {

                    //Currently selected, subs and unused are extracted here,
                    //  and the main pos arrays are extracted server side, this will be changed
                    const lightweightTeam = extractPlayerIds(team);


                    const aiTeamData = {
                        team_id: team.dbId,
                        attackers: playerToId(team.attackers) || [],
                        midfielders: playerToId(team.midfielders) || [],
                        defenders: playerToId(team.defenders) || [],
                        keepers: playerToId(team.keepers) || [],
                        selected: lightweightTeam.selected,  
                        subs: lightweightTeam.subs,          
                        unused: lightweightTeam.unused  
                    };
                    console.log(`Team ${i} data prepared:`, aiTeamData);
                    teamPlayersData.push(aiTeamData);
                } else {
                    console.error(`Team ${i} missing database ID`);
                }
            }
            
            console.log('Total teams to upload:', teamPlayersData.length);
            console.log('teamPlayersData:', JSON.stringify(teamPlayersData));
            
            // Upload team players
            const uploadFormData = new FormData();
            uploadFormData.append('teamPlayers', JSON.stringify(teamPlayersData));
            
            console.log('Calling ?/uploadTeamPlayers...');
            const uploadResponse = await fetch('?/uploadTeamPlayers', {
                method: 'POST',
                body: uploadFormData
            });
            
            console.log('uploadResponse status:', uploadResponse.status);
            const uploadResult = await uploadResponse.json();
            console.log('uploadResult:', uploadResult);
            
            if (uploadResult.type === 'success') {
                console.log('Team players successfully uploaded');
                
                // Finalize draft for teams table (transfer budget, player count)
                const teamUpdates = [];
                
                // Player team update
                console.log('Preparing player team update...');
                if (playerTeam.dbId) {
                    const playerUpdate = {
                        team_id: playerTeam.dbId,
                        transfer_budget: Math.round(playerTeam.transferBudget),
                        player_count: playerTeam.playerCount
                    };
                    console.log('Player team update:', playerUpdate);
                    teamUpdates.push(playerUpdate);
                }
                
                // AI teams updates
                console.log('Preparing AI team updates...');
                for (let i = 1; i < draft.totalTeams; i++) {
                    const team = teams[`team${i}`];
                    
                    if (team.dbId) {
                        const teamUpdate = {
                            team_id: team.dbId,
                            transfer_budget: Math.round(team.transferBudget),
                            player_count: team.playerCount
                        };
                        console.log(`Team ${i} update:`, teamUpdate);
                        teamUpdates.push(teamUpdate);
                    }
                }
                
                console.log('Total team updates:', teamUpdates.length);
                console.log('teamUpdates:', JSON.stringify(teamUpdates));
            
                const updateFormData = new FormData();
                updateFormData.append('teamUpdates', JSON.stringify(teamUpdates));
                
                console.log('Calling ?/draftTeamsFinalize...');
                const updateResponse = await fetch('?/draftTeamsFinalize', {
                    method: 'POST',
                    body: updateFormData
                });
                
                console.log('updateResponse status:', updateResponse.status);
                const updateResult = await updateResponse.json();
                console.log('updateResult:', updateResult);
                
                if (updateResult.type === 'success') {
                    console.log('Draft teams finalized');
                    
                    draftUploaded = true;
                    console.log('draftUploaded set to true');

                    console.log('Calling ?/draftUploaded...');
                    const draftFinalizedResponse = await fetch('?/draftUploaded',{
                        method: 'POST',
                        body: new FormData()
                    })
                    
                    console.log('draftFinalizedResponse status:', draftFinalizedResponse.status);
                    const draftFinalized = await draftFinalizedResponse.json()
                    console.log('draftFinalized result:', draftFinalized);

                    if (draftFinalized.type === 'success'){
                        console.log('Draft marked as complete in leagues DB')
                    } else {
                        console.error('Failed to mark draft as complete:', draftFinalized);
                    }
                } else {
                    console.error('Failed to finalize draft teams:', updateResult);
                    console.error('Error detail:', updateResult.data?.error);
                }
            } else {
                console.error('Failed to upload team players:', uploadResult);
                console.error('Error detail:', uploadResult.data?.error);
            }
            
        } catch (error) {
            console.error('Error in finalizeAndUploadDraft:', error);
            console.error('Error stack:', error.stack);
        } finally {
            console.log('finalizeAndUploadDraft completed');
            console.log('Final draftUploaded value:', draftUploaded);
        }
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
            const potentialRivalIndex = Math.floor(Math.random() * (draft.totalTeams - 1)) + 1;

            if (index === draft.totalTeams ) {
                if ((clubsWithRivals[potentialRivalIndex] || []).length <= 1) {
                    playerTeam.rivals.push({
                        name: teams[`team${potentialRivalIndex}`].name,
                        index: potentialRivalIndex,
                    });
                    teams[`team${potentialRivalIndex}`].rivals.push({
                        name: playerTeam.name,
                        index: 0,
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

    // Draft Flow Functions
    function beginDraft() {
        if (!draft.started) {
            draft.started = true;
            draft.currentRound = 1;
            draft.currentPick = 1;
            console.log('order list', draft.orderList)
            let currPick = draft.orderList[0];
            let nextPick = draft.orderList[1];
            console.log(currPick)
            draft.currentTeam = currPick.id === 'player' ? playerTeam.name : currPick.name;
            console.log('currentTeam: ', draft.currentTeam);
            draft.nextTeam = nextPick.id === 'player' ? playerTeam.name : nextPick.name;
        }
    }

    function advanceDraft() {
        let pickIndex = (draft.currentRound - 1) * draft.totalTeams  + (draft.currentPick - 1);

        if(draft.currentRound >= 16){
            draft.complete = true;
        }

        if (clubsWithoutMoney.total >= halfOfTeams){
            draft.complete = true;
        }

        if (draft.currentPick === draft.totalTeams) {
            draft.currentRound++;
            draft.currentPick = 1;
        } else {
            draft.currentPick++;
        }

        if (draft.availablePlayers.length < 30) {
            draft.complete = true;
            return;
        }

        let nextPickIndex = (draft.currentRound - 1) * draft.totalTeams + (draft.currentPick - 1);

        draft.currentTeam = draft.orderList[nextPickIndex].id === 'player' ?
            playerTeam.name : draft.orderList[nextPickIndex].name;

        draft.nextTeam = (nextPickIndex + 1 < draft.orderList.length) ?
            (draft.orderList[nextPickIndex + 1].id === 'player' ?
                playerTeam.name : draft.orderList[nextPickIndex + 1].name) :
            'None';
    }

    async function skipToPlayerPick() {
        while (!draft.complete &&
            draft.currentTeam !== playerTeam.name) {
            const currentTeamId = draft.orderList[
                (draft.currentRound - 1) * draft.totalTeams + (draft.currentPick - 1)
            ].id;

            await executePick(currentTeamId, false);
            advanceDraft();
        }

        if (draft.complete) {
            return;
        }
    }

    // Draft Pick Handlers
    function handleAIPick(teamId) {
        if(!draft.complete){
            executePick(teamId, false);
            advanceDraft()
        }
    }

    function handlePlayerPick(player, e) {
        if(!draft.complete){
            if (!player.image_path || player.image_path === '' || player.image_path === undefined || player.image_path === null) {
                player.image_path = e
            }
            executePick('player', true, player)
            advanceDraft()
        }
    }

    async function executePick(teamId, isPlayer, player = null, transferVal = null) {
        const pickingTeam = teamId === 'player' ? playerTeam : teams[teamId];
        const traits = pickingTeam.traits || [];

        if (clubsWithoutMoney.clubNumbers.includes(teamId)){
            return false;
        }
        if (!isPlayer) {
            const affordablePlayers = draft.availablePlayers.filter(
                (p) => p.transfer_value <= pickingTeam.transferBudget
            );
            
            if (affordablePlayers.length < 15) {
                console.log('Club is running low on funds, adding to broke list');
                clubsWithoutMoney.clubNumbers.push(teamId);
                clubsWithoutMoney.total += 1;
                return false;
            }

            if (affordablePlayers.length < 1) {
                console.log('No affordable players available');
                return false;
            }

            const positionScores = getPositionalNeeds(pickingTeam, traits);

            const scoredPlayers = affordablePlayers.slice(0, (Math.floor(Math.random() * 12) + 15)).map((p, index) => ({
                ...p,
                score: getPlayerValue(index, p, traits) + positionScores[p.position]
            })).sort((a, b) => b.score - a.score)

            if (scoredPlayers.length < 1) {
                return false;
            }

            player = scoredPlayers[0]
            if (!player.image_path || player.image_path === '' || player.image_path === undefined || player.image_path === null) {
                player.image_path = await getPlayerPicture(player.id)
            }
        }

        transferVal = player.transfer_value;

        if (transferVal > pickingTeam.transferBudget) {
            console.log('Insufficient funds');
            return false;
        }

        const position = player.position ? player.position : null;
        if (position === null) return false;

        if (player.keeper_score) {
            pickingTeam.scores.total.keeping += player.keeper_score;
        }
        if (player.defensive_score) {
            pickingTeam.scores.total.defense += player.defensive_score;
        }
        if (player.possession_score) {
            pickingTeam.scores.total.possession += player.possession_score;
        }
        if (player.passing_score) {
            pickingTeam.scores.total.passing += player.passing_score;
        }
        if (player.attacking_score) {
            pickingTeam.scores.total.attacking += player.attacking_score;
        }
        if (player.finishing_score) {
            pickingTeam.scores.total.finishing += player.finishing_score;
        }

        switch (position) {
            case 'Goalkeeper':
                pickingTeam.keepers.push(player);
                break;
            case 'Defender':
                pickingTeam.defenders.push(player);
                break;
            case 'Midfielder':
                pickingTeam.midfielders.push(player);
                break;
            case 'Attacker':
                pickingTeam.attackers.push(player);
                break;
            default:
                return false;
        }

        pickingTeam.transferBudget -= transferVal;
        pickingTeam.playerCount++;

        draft.availablePlayers = draft.availablePlayers.filter(p => p.id !== player.id)

        console.log(player)
        return player;
    }

</script>


<div class="draft-main-container">
    {#if draft.gate1}
    <div class="draft-ticker-container">
        <!-- {draft.currentTeam} -->
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
            {#if draft.gate1 && !draft.started}
            <div class="start-draft-btn">
                <button
                    onclick={beginDraft}
                    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
                    >
                    Start Draft
                </button>
            </div>
            {/if}

            {#if draft.started && !draft.complete}
            {#if draft.currentTeam !== playerTeam.name}
            <div class="draft-buttons">
                <!-- {draft.currPick.id}
                {draft.currPick.name} -->
                <button
                    onclick={() => handleAIPick(draft.orderList[(draft.currentRound - 1) * draft.totalTeams +(draft.currentPick -1)].id)}
                    class="advance-btn">Advance Draft
                </button>
                <button
                    onclick={skipToPlayerPick}
                    class="skip-btn">Skip to Next Player Pick
                </button>
            </div>
            {/if}
            {/if}
            </div>

            {#if !draft.complete}
                <div class="page-container">
                    <div class="players-section">
                        <h3>Total Players: {draft.availablePlayers.length}</h3>
                        <div class="player-list">
                            {#each draft.availablePlayers as player (player.id)}
                            <DraftPlayer player={player}
                                onDraft={(e)=> handlePlayerPick(player, e)}
                                />
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
                            .filter(([,team]) => team.name !== '')
                            .sort(([,a],[,b]) => a.draftOrder - b.draftOrder) as [key, team]}
                            <DraftTeam team={team} />
                            {/each}
                        </div>
                    </div>
                    {/if}
                </div>
            {:else}
                <h1>Draft Complete!</h1>
            {/if}
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
