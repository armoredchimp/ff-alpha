<script>
import {
    onMount
} from 'svelte';
import { goto } from '$app/navigation';
import axios from 'axios';
import '../../../app.css';
import {
    allPlayers
} from '$lib/stores/generic.svelte';
import {
    generateClubName,
    assignDraftOrder,
    organizeDraftOrder,
    generateClubTraits,
    playerName,
    delay,
    getRandomItem
} from '$lib/utils/utils';
import {
    teams,
    playerTeam
} from '$lib/stores/teams.svelte';
import {
    getPlayerPicture
} from '$lib/api/sportsmonk/utils/apiUtils.svelte';
import {
    getSetDraft,
    draft
} from '$lib/stores/draft.svelte';
import {
    firstParts,
    secondParts,
    commonNames
} from '$lib/data/rngClubNames';
import {
    formationConfig
} from '$lib/data/formationConfig';
import DraftPlayer from '$lib/DraftPlayer.svelte';
import DraftTicker from '$lib/DraftTicker.svelte';
import PlayerDraftTeam from '$lib/PlayerDraftTeam.svelte';
import DraftTeam from '$lib/DraftTeam.svelte';
import {
    countryMap,
    getCountry
} from '$lib/data/countries';
import {
    supabase,
    supabaseScaling
} from '$lib/supabase/supaClient';
import {
    managers
} from "$lib/stores/generic.svelte";
import {
    getLeagueState,
    setLeagueId
} from '$lib/stores/league.svelte';

const { data } = $props()

// Local Draft Variables
const localDraftState = getSetDraft();
const localDraftReference = $state(draft)
let totalTeams = $state(14);
let countriesCode = $state(1)
let numberPool = $state(null)
let selectedNames = $state({});
let clubsWithRivals = $state({});

// Caching getTraitEffects
const traitEffectsCache = new Map();

onMount(async () => {
    // Populate allPlayers from server data
    if (data.players && data.players.length > 0) {
        for (const player of data.players) {
            allPlayers.push(player);
        }
        console.log(`Loaded ${data.players.length} players`);
        localDraftState.setGate0(true);
    }
    
    // Populate managers from server data
    if (data.managers && data.managers.length > 0) {
        for (const manager of data.managers) {
            managers.push(manager);
        }
        console.log(`Loaded ${data.managers.length} managers`);
    }

    numberPool = Array.from({length: totalTeams}, (_, i) => i + 1);
});

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
    const formData = new FormData();
    formData.append('playerId', id);
    
    try {
        const response = await fetch('?/getPlayerById', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.type === 'success' && result.data) {
            console.log(result.data.player);
            return result.data.player;
        } else {
            console.error('Failed to fetch player');
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}
// async function getPremPlayersFromMini() {
//     let {
//         data: players,
//         error
//     } = await supabase
//         .from('prem_mini_2425')
//         .select('*')
//         .order('transfer_value', {
//             ascending: false
//         });

//     if (error) {
//         console.error(error);
//     }

//     for (const player of players) {
//         allPlayers.push(player);
//     }

//     console.log(allPlayers);
//     localDraftState.setGate0(true);
// }

// async function getPremPlayers() {
//     let lads = [];
//     try {
//         const premRes = await axios.get('/api/teams/seasons/23614', {
//             params: {
//                 include: 'players.player.detailedPosition;players.player.position',
//             },
//         });
//         lads = premRes.data.data;
//         console.log(lads);
//         console.log(`Lads total: ${lads.length}`);
//         for (const team of lads) {
//             if (team.players && team.players.length > 0) {
//                 for (const player of team.players) {
//                     if (player.player.date_of_birth !== null) {
//                         const position = player.player.position.name;
//                         let dPosition = null;
//                         if (player.player.detailedposition && player.player.detailedposition.name) {
//                             dPosition = player.player.detailedposition.name;
//                         }
//                         const nation = await getCountry(player.player.country_id);
//                         allPlayers.push({
//                             ...player.player,
//                             position: position,
//                             detailedPosition: dPosition,
//                             nationality: nation,
//                             team_name: team.name,
//                         });
//                     }
//                 }
//             }
//         }
//         console.log(allPlayers);
//     } catch (err) {
//         console.error(err);
//     }
// }


async function draftSetup() {
    playerTeam.name = playerName();
    // Remove await getManagers() - managers are already loaded from server
    
    for (let i = 1; i < totalTeams; i++) {
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
        if (managers.length > 0) {
            teams[`team${i}`].manager = getRandomItem(managers)
            if (teams[`team${i}`].manager.preferred_formation !== null) {
                teams[`team${i}`].formation = teams[`team${i}`].manager.preferred_formation
            }
            console.log('manager: ', teams[`team${i}`].manager)
        }
        if (sameCity) {
            assignRivals(firstName, true, i);
        }
    }

    for (let i = totalTeams; i > 0; i--) {
        if ((clubsWithRivals[i] || []).length < 2) {
            assignRivals('', false, i);
        }
    }

    const leagueState = getLeagueState();

    localDraftState.setPlayers(allPlayers)
    playerTeam.draftOrder = assignDraftOrder(numberPool);
    localDraftState.setOrderList(organizeDraftOrder(playerTeam, teams));
    localDraftState.setGate1(true);

    // Prepare teams data for Supabase insertion
    const teamsToInsert = [];

    // Add player team
    teamsToInsert.push({
        league_id: leagueState.leagueId,
        team_name: playerTeam.name,
        rivals: playerTeam.rivals || [],
        formation: playerTeam.formation || '4-4-2',
        transfer_budget: 50000,
        player_count: 0 // Will be updated during draft
    });

    // Add AI teams
    for (let i = 1; i < totalTeams; i++) {
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
            player_count: 0 // Will be updated during draft
        });
    }

    console.log('Teams to insert:', JSON.stringify(teamsToInsert, null, 2));
    
    // Replace direct Supabase call with server action
    try {
        const formData = new FormData();
        formData.append('teams', JSON.stringify(teamsToInsert));
        
        const response = await fetch('?/insertTeams', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.type === 'success') {
            console.log('Teams successfully uploaded to Supabase');
        } else {
            console.error('Error inserting teams:', result.data?.error);
            throw new Error(result.data?.error || 'Failed to insert teams');
        }
    } catch (error) {
        console.error('Failed to upload teams to Supabase:', error);
    }
}

async function getManagers() {
    try {
        let {
            data,
            error
        } = await supabase
            .from('active_managers')
            .select('*')

        if (error) {
            console.error('error retrieving managers', error)
        }

        data.forEach(row => {
            managers.push(row)
        })
    } catch (err) {
        console.error('supa error at try catch', err)
    }
}

// async function getCoachesApi(){
//     try {
//         const premRes = await axios.get('/api/teams/seasons/23614', {
//             params: {
//                 include: 'players.player;coaches'
//             }
//         });
//         const lads = premRes.data.data;
//         console.log("Teams and Players:", lads);
//         const coaches = []
//         for (const team of lads){
//             if(team.coaches && team.coaches.length > 0){
//                 for (const coach of team.coaches){
//                     if (coach.active === true){
//                         coaches.push([coach, team.name])
//                     }
//                 }
//             }
//         }
//         console.log('coaches: ', coaches)

//         try {
//             for (const coach of coaches){
//                 const coachRes = await axios.get(`/api/coaches/${coach[0].coach_id}`)
//                 if (coachRes){
//                     managers.push(coachRes.data.data)
//                 }
//             }
//         }catch(err){
//             console.error(err)
//         }

//     }catch(err){
//         console.error(err)
//     }
// }

function assignRivals(firstName, bool, index) {
    clubsWithRivals[index] = clubsWithRivals[index] || [];

    // Limit each club to at most two rivals
    if (clubsWithRivals[index].length >= 2) return;

    // Establish rivalry based on matching first names when same-city flag is set
    if (bool === true) {
        if (selectedNames[firstName]) {
            const foundRival = selectedNames[firstName];

            // Add mutual rivalry entries between current club and found rival
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
    // Attempt to assign random rivals up to two total
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

        // 50% chance for rivalry
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
    advanceDraft()
}

function handlePlayerPick(player, e) {
    //image path may be passed up from whichever draftPlayer component was selected for drafting
    if (!player.image_path || player.image_path === '' || player.image_path === undefined || player.image_path === null) {
        player.image_path = e
    } //if this condition fails it will already be a property of player
    executePick('player', true, player)
    advanceDraft()
}

async function executePick(teamId, isPlayer, player = null, transferVal = null) {
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
            // console.log('image', player.image_path)
        }
    }

    transferVal = player.transfer_value;

    if (transferVal > pickingTeam.transferBudget) {
        console.log('Insufficient funds');
        return false;
    }

    const position = player.position ? player.position : null;
    if (position === null) return false;

    // Update team scores based on player attributes (divided by 10)
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

    localDraftState.setPlayers(draft.availablePlayers.filter(p => p.id !== player.id))

    console.log(player)
    return player;

}

function getPositionalNeeds(team, traits) {
    //derive targets from the selected formation
    const config = formationConfig[team.formation];
    const posTargets = config.reduce((acc, [group, ...positions]) => {
        // turn "keepers" → "keeper", "defenders" → "defender", etc.
        const singular = group.slice(0, -1);
        // sum up the max values for this group
        acc[singular] = positions.reduce((sum, [, max]) => sum + max, 0);
        return acc;
    }, {});

    const positionsCount = {
        goalkeeper: team.keepers.length,
        defender: team.defenders.length,
        midfielder: team.midfielders.length,
        attacker: team.attackers.length,
    };

    //if you’ve already met or exceeded all targets, draft one of each
    const allTargetsMet = Object.entries(posTargets).every(
        ([pos, target]) => positionsCount[pos] >= target
    );
    if (allTargetsMet) {
        return Object.fromEntries(
            Object.keys(posTargets).map((pos) => [pos, 1])
        );
    }

    //otherwise apply original trait-based weighting
    const traitEffects = getTraitEffects(traits);
    return {
        Goalkeeper: positionsCount.goalkeeper >= posTargets.goalkeeper ?
            -15 :
            positionsCount.goalkeeper === 0 ?
            30 :
            positionsCount.goalkeeper === 1 ?
            2 :
            0,

        Defender: positionsCount.defender >= posTargets.defender ?
            -15 :
            (posTargets.defender - positionsCount.defender) *
            (traitEffects.defensive ? 3 : 2),

        Midfielder: positionsCount.midfielder >= posTargets.midfielder ?
            -15 :
            (posTargets.midfielder - positionsCount.midfielder) * 2,

        Attacker: positionsCount.attacker >= posTargets.attacker ?
            -15 :
            (posTargets.attacker - positionsCount.attacker) *
            (traitEffects.attacking ? 3 : 2),
    };
}

function getPlayerValue(index, player, traits) {
    const position = player.position;
    const isWinger = player.detailed_position === "Right Wing" || player.detailed_position === "Left Wing"
    let score = 0;

    score += index < 5 ?
        Math.floor(Math.random() * 3) + 8 :
        index < 10 ?
        Math.floor(Math.random() * 4) + 4 :
        Math.floor(Math.random() * 3) + 1;

    //Defensive Trait
    if (getTraitEffects(traits).defensive && player.tackles_per90 && player.ints_per90) {
        if (position === 'Defender') {
            score += 2
        }
        score += (player.tackles_per90 * 0.4) + (player.ints_per90 * 0.3)
    }

    //Passing Trait
    if (getTraitEffects(traits).passing && player.key_passes_per90) {
        const passingMultiplier = position === 'Midfielder' ? 1.2 : 0.8;
        score += player.key_passes_per90 * passingMultiplier
    }

    //High Pressure Trait
    if (getTraitEffects(traits).pressure && player.tackles_per90 && player.ints_per90 && player.fouls_per90) {
        score += (player.tackles_per90 * 0.6) + (player.ints_per90 * 0.5) - (player.fouls_per90 * 0.2)
    }

    //Attacking Trait
    if (getTraitEffects(traits).attacking && player.goals_per90 && player.assists_per90) {
        let attackingMultiplier = position === 'Attacker' ? 1.4 : position === 'Midfielder' ? 1.2 : 1;
        score += (player.goals_per90 * attackingMultiplier) + (player.assists_per90 * 0.5)
    }

    //   Wing Play Trait
    if (getTraitEffects(traits).wingPlay && player.accurate_crosses_per90 && player.successful_dribbles_per90) {
        if (isWinger)
            score += 1
        if (position === 'Midfielder') {
            score += (player.accurate_crosses_per90 * 1.3) + (player.successful_dribbles_per90 * 0.8);
        } else if (position === 'Attacker' || position === 'Forward') {
            score += (player.accurate_crosses_per90 * 1.5) + (player.successful_dribbles_per90 * 1.0);
        } else {
            score += (player.accurate_crosses_per90 * 1.0) + (player.successful_dribbles_per90 * 0.6);
        }
    }

    // //Aggressive Trait
    // if (getTraitEffects(traits).aggressive && player.fouls_per90 && player.yellow_cards_per90 && player.red_cards_per90) {
    //     score += (player.fouls_per90 * 1.0) + (player.yellow_cards_per90 * 0.5) + (player.red_cards_per90 * 2.0); //Adjusted for card severity
    // }

    //Youth Trait
    if (getTraitEffects(traits).youth && player.player_age) {
        let ageScore = 0;
        if (player.player_age >= 18 && player.player_age <= 21) {
            ageScore = 5;
        } else {
            const distanceFromIdeal = player.player_age < 18 ? 18 - player.player_age : player.player_age - 21;
            ageScore = Math.max(-3, 5 - (distanceFromIdeal * 0.5));
        }
        score += ageScore;
    }

    //Experience Trait
    if (getTraitEffects(traits).experience && player.player_age) {
        let ageScore = 0;
        if (player.player_age >= 28 && player.player_age <= 32) {
            ageScore = 5;
        } else {
            const distanceFromIdeal = player.player_age < 28 ? 28 - player.player_age : player.player_age - 32;
            ageScore = Math.max(-3, 5 - (distanceFromIdeal * 0.5));
        }
        score += ageScore;
    }

    // //Teamwork Trait
    // if (getTraitEffects(traits).teamwork && player.assists_per90 && player.passes_completed_percentage && player.yellow_cards_per90 && player.red_cards_per90 && player.goals_per90) {
    //     score -= (player.red_cards_per90 * 2) + (player.yellow_cards_per90 * 0.5);
    //     score += (player.assists_per90 * 1.2) + (player.passes_completed_percentage * 0.4);
    //     if (player.goals_per90 > player.assists_per90 * 2) {
    //         score -= (player.goals_per90 - player.assists_per90 * 2) * 0.3;
    //     }
    // }

    //Set Piece Trait
    if (getTraitEffects(traits).setPiece && player.assists_per90 && player.goals_per90) {
        if (position === 'Midfielder') {
            score += player.assists_per90 * 1.5;
        } else if (position === 'Defender') {
            score += player.goals_per90 * 2.0;
        } else {
            score += (player.goals_per90 * 1.0) + (player.assists_per90 * 1.0); //Default for other positions
        }
    }

    return score;
}

function advanceDraft() {
    // Calculate the current pick index before incrementing
    let pickIndex = (draft.currentRound - 1) * 14 + (draft.currentPick - 1);

    // Now increment for the next pick
    if (draft.currentPick === 14) {
        draft.currentRound++;
        draft.currentPick = 1;
    } else {
        draft.currentPick++;
    }

    if (draft.availablePlayers.length < 30) {
        draft.complete = true;
        return;
    }

    // Calculate the next pick index
    let nextPickIndex = (draft.currentRound - 1) * 14 + (draft.currentPick - 1);

    // Use nextPickIndex to set the current and next teams
    draft.currentTeam = draft.orderList[nextPickIndex].id === 'player' ?
        playerTeam.name : draft.orderList[nextPickIndex].name;

    draft.nextTeam = (nextPickIndex + 1 < draft.orderList.length) ?
        (draft.orderList[nextPickIndex + 1].id === 'player' ?
            playerTeam.name : draft.orderList[nextPickIndex + 1].name) :
        'None';
}

async function skipToPlayerPick() {
    // Keep processing picks until it's the player's turn or draft ends
    while (!draft.complete &&
        draft.currentTeam !== playerTeam.name) {
        // Execute AI pick
        const currentTeamId = draft.orderList[
            (draft.currentRound - 1) * 14 + (draft.currentPick - 1)
        ].id;

        await executePick(currentTeamId, false);

        // Advance to next pick
        advanceDraft();

    }

    if (draft.complete) {
        return;
    }

    // At this point, it's guaranteed to be player's turn
    // The advanceDraft() call has already updated currentTeam/nextTeam
}
</script>

<!-- <button onclick={getTeamsList}>Get Teams</button> -->
<!-- <button onclick={getPlayerById(539961)}>getPlayerById</button> -->
<!-- <button onclick={getPremPlayersFromMini}>Get Players</button> -->
<!-- <button onclick={getPremPlayers}>Get Players From API</button> -->

<div class="draft-main-container">
    {#if draft.gate1}
    <div class="draft-ticker-container">
        <!-- {draft.currentTeam} -->
        <DraftTicker ticker={localDraftReference}/>
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

            {#if draft.started}
            {#if draft.currentTeam !== playerTeam.name}
            <div class="draft-buttons">
                <!-- {draft.currPick.id}
                {draft.currPick.name} -->
                <button
                    onclick={() => handleAIPick(localDraftReference.orderList[(localDraftReference.currentRound - 1) * 14 +(localDraftReference.currentPick -1)].id)}
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

            <div class="page-container">
                <div class="players-section">
                    <h3>Prem Players: {draft.availablePlayers.length}</h3>
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
