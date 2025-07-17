<script>
	import axios from "axios";
    import '../app.css';
    import { Amplify } from 'aws-amplify';
    import amplifyConfig from "$lib/api/aws/amplifyConfig";
	import { onMount } from "svelte";
    import { getCurrentUser, signOut } from "aws-amplify/auth";
    import { statsToRank, keeperStatsToRank } from "$lib/data/statsToRank";
    import { supabase } from "$lib/supabase/supaClient";
    import { delay, calculateAge } from "$lib/utils/utils";
    import { countryMap, getCountry } from '$lib/data/countries';
    import { allPlayers, outfieldAverages, keeperAverages, defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, defenseImpMap, passingImpMap, possessionImpMap, attackingImpMap, keepingImpMap } from "$lib/stores/generic.svelte";
	import PlayerTeam from "$lib/PlayerDraftTeam.svelte";
	import { draft } from "$lib/stores/draft.svelte";
	import Page from "./+page.svelte";
	import { managers } from "$lib/stores/generic.svelte";
	import { userStore, setUser, getUser, resetUserStore } from "$lib/stores/userStore.svelte";
	import { goto, invalidateAll } from "$app/navigation";
	
    

	onMount(()=>{
        Amplify.configure(amplifyConfig)
        checkUser()
        fetchAllWeights()
        getAverages()
	})


	let { children } = $props();
   
    let weightsFetched = $state(false)
    let devBarVisible = $state(true)

    function capScore(score) {
        return Math.min(score, 5000);
    }

    async function checkUser(){
        try{
            const currentUser = await getCurrentUser()
            if(currentUser !== null || currentUser !== undefined){
                setUser(currentUser)
                console.log('user set at startup!')
                console.log(JSON.stringify(userStore))
            }

        }catch(error){
            console.log('No logged in user')
            console.error(error)
        }
    }

   async function signUserOut() {
        try {
            // Sign out from Amplify
            await signOut();
            
            // Reset local store
            resetUserStore();
            
            // Delete server session
            await axios.delete('/api/auth/session');
            
            console.log('Logged out');
            
            // This forces all load functions to re-run
            await invalidateAll();
            
            // Navigate to home
            goto('/');
            
        } catch(error) {
            console.error('Logout error:', error);
            await invalidateAll();
            goto('/');
        }
    }

    async function getAverages(){
        const { data: outfieldData, outError } = await supabase
            .from('outfield_per90_averages')
            .select('*') 

        if (outError){
            console.error('Error retrieving outfield avgs: ', outError)
        }
        const { data: keeperData, keepError } = await supabase
            .from('gk_per90_averages')
            .select('*') 

        if (keepError){
            console.error('Error retrieving keeper avgs: ', keepError)
        }
        setAvgs(outfieldData, keeperData, outfieldAverages, keeperAverages)
    }

    function setAvgs(outD, keepD, outAvgs, keepAvgs){
        outAvgs['data'] = outD;
        keepAvgs['data'] = keepD;
        console.log(outfieldAverages, keeperAverages)
    }

    async function addExtraPlayers(ids){
        for(let i = 0; i < ids.length; i++){
            getPlayerStatsAndUpload(ids[i])
        }
    }

    function calculateImportance(weight) {
        if (weight >= 0) {
            if (weight < 100) return 1;
            if (weight < 200) return 2;
            if (weight < 300) return 3;
            if (weight < 500) return 4;
            return 5;
        } else {
            if (weight > -100) return -1;
            if (weight > -200) return -2;
            if (weight > -300) return -3;
            if (weight > -500) return -4;
            return -5;
        }
    }

    async function getWeightsFromTable(tableName, weightMap, impMap){
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.error(`Error fetching weights from ${tableName}`)
            return null;
        }
        
        data.forEach(row => {
            const weights = Object.keys(row).reduce((acc, key) => {
                if (key !== 'Position') {
                    acc[key] = row[key];
                }
                return acc;
            }, {});

            weightMap[row.Position] = weights;

            // Calculate and add importance to the impMap
            const importances = {};
            Object.keys(weights).forEach(stat => {
                importances[stat] = calculateImportance(weights[stat]);
            });
            impMap[row.Position] = importances;
        });

        // console.log(`Weight Map returned: `, weightMap);
        // console.log(`Importance Map returned: `, impMap);
    }

    async function fetchAllWeights(){
        await Promise.all([
            getWeightsFromTable('getDefensiveScore', defenseWeightMap, defenseImpMap),
            getWeightsFromTable('getKeeperScore', keepingWeightMap, keepingImpMap),
            getWeightsFromTable('getPossessionScore', possessionWeightMap, possessionImpMap),
            getWeightsFromTable('getPassingScore', passingWeightMap, passingImpMap),
            getWeightsFromTable('getAttackingScore', attackingWeightMap, attackingImpMap)
        ])

        weightsFetched = true
    }

    async function getPlayersThenScore(miniDB) {
        await fetchAllWeights()

        if(weightsFetched){
        try {
            let { data: players, error } = await supabase
                .from('prem_stats_2425')
                .select('*');

            if (error) {
                console.error('Error fetching players:', error);
                return;
            }

            console.log(`Fetched ${players.length} players.`);

            for (const player of players) {
                console.log(`Processing player: ${player["Player Name"]}`);

                await delay(500);
                
                const playerData = {
                    id: player.id,
                    player_name: player["Player Name"],
                    position: player.Position,
                    detailed_position: player["Detailed Position"],
                    keeper_score: null,
                    defensive_score: null,
                    passing_score: null,
                    possession_score: null,
                    attacking_score: null,
                    total_score: null,
                    transfer_value: null,
                    player_age: null
                };

                let attacking = null;
                let keeping = null;
                let passing = null;
                let defense = null;
                let possession = null;
                let total = 0;
                const isKeeper = player.Position === 'Goalkeeper';
                const isMidfielder = player.Position === 'Midfielder';
                const isAttacker = player.Position === 'Attacker';
                const isCB = player["Detailed Position"] === 'Centre-Back';
                const isFullback = player["Detailed Position"] === 'Left-Back' || player["Detailed Position"] === 'Right-Back';

                if (!isKeeper) {
                    defense = getDefensiveScore(player, player["Detailed Position"]);
                    total += parseFloat(defense.score);
                  
                    passing = getPassingScore(player, player["Detailed Position"]);
                    total += parseFloat(passing.score);
                   
                    possession = getPossessionScore(player, player["Detailed Position"]);
                    total += parseFloat(possession.score);
                    
                    attacking = getAttackingScore(player, player["Detailed Position"]);
                    total += parseFloat(attacking.score);
                   
                    const p90s = {
                        PlayerName: playerData.player_name,
                        PlayerTeam: player["Player Team"],
                        MinutesPlayed: player["Minutes Played"],
                        Position: playerData.position,
                        DetailedPosition: playerData.detailed_position,
                        ...defense.p90s,
                        ...passing.p90s,
                        ...possession.p90s,
                        ...attacking.p90s,
                    }

             
                    if (defense?.p90s?.TacklesPer90) playerData.tackles_per90 = defense.p90s.TacklesPer90;
                    if (defense?.p90s?.InterceptionsPer90) playerData.ints_per90 = defense.p90s.InterceptionsPer90;
                    if (defense?.p90s?.FoulsPer90) playerData.fouls_per90 = defense.p90s.FoulsPer90;
                    if (passing?.p90s?.KeyPassesPer90) playerData.key_passes_per90 = passing.p90s.KeyPassesPer90;
					if (passing?.p90s?.AccurateCrossesPer90) playerData.accurate_crosses_per90 = passing.p90s.AccurateCrossesPer90;
                    if (attacking?.p90s?.GoalsPer90) playerData.goals_per90 = attacking.p90s.GoalsPer90;
                    if (attacking?.p90s?.AssistsPer90) playerData.assists_per90 = attacking.p90s.AssistsPer90;
					if (attacking?.p90s?.SuccessfulDribblesPer90) playerData.successful_dribbles_per90 = attacking.p90s.SuccessfulDribblesPer90;


                    await insertPer90s(player.id, p90s)

                    if (isMidfielder) {
                        total *= 1.05;
                    } else if (isAttacker) {
                        total *= 1.3;
                    } else if (isCB) {
                        total *= 1.6;
                    } else if (isFullback) {
                        total *= 0.95;
                    }

                    total = (total / 4).toFixed(2);
                    console.log('total:  ', total)
                    playerData.defensive_score = parseFloat(defense.score)
                    playerData.passing_score = parseFloat(passing.score)
                    playerData.possession_score = parseFloat(possession.score)
                    playerData.attacking_score = parseFloat(attacking.score)
    
                } else {
                    keeping = getKeeperScore(player, player["Detailed Position"]);
                    total += parseFloat(keeping.score);

                    passing = getPassingScore(player, player["Detailed Position"]);
                    total += parseFloat(passing.score);

                    total = (total / 2).toFixed(2);

                    playerData.keeper_score = parseFloat(keeping.score)
                    playerData.passing_score = parseFloat(passing.score)

                    const p90s = {
                        PlayerName: playerData.player_name,
                        PlayerTeam: player["Player Team"],
                        MinutesPlayed: player["Minutes Played"],
                        Position: playerData.position,
                        DetailedPosition: playerData.detailed_position,
                        ...keeping.p90s,
                        ...passing.p90s,
                    }

                    await insertPer90s(player.id, p90s)
                }
                playerData.total_score = total;
                playerData.transfer_value = (total * 20).toFixed(2);
                playerData.player_age = player.Age;
                playerData.player_team = player["Player Team"];
                playerData.nationality = player.Nation;

                const { error: uploadError } = await supabase
                    .from(miniDB)
                    .upsert([playerData]);

                if (uploadError) {
                    console.error(`Error uploading scores for player ${player["Player Name"]}:`, uploadError);
                } else {
                    console.log(`Successfully uploaded scores for player ${player["Player Name"]}`);
                }
            }

            console.log('All players processed and scores uploaded.');
        } catch (err) {
            console.error('Error in getPlayersThenScore:', err);
        }
    }}


	//bizarre errors when trying to run this functionality in the draft page. Creating an almost duplicate function here *shrug*
    async function getCoachesToDB(){
        try {
            const premRes = await axios.get('/api/teams/seasons/23614', {
                params: {
                    include: 'players.player;coaches'
                }
            });
            const lads = premRes.data.data;
            console.log("Teams and Players:", lads);
            const coaches = []
            for (const team of lads){
                if(team.coaches && team.coaches.length > 0){
                    for (const coach of team.coaches){
                        if (coach.active === true){
                            coaches.push([coach, team.name])
                        }
                    }
                }
            }
            console.log('coaches: ', coaches)

            try {
                for (const coach of coaches){
                    const coachRes = await axios.get(`/api/coaches/${coach[0].coach_id}`)
                    if (coachRes){
                        let manager = coachRes.data.data
						manager.age = calculateAge(manager.date_of_birth)
						manager.league_id = 1
						manager.nationality = getCountry(manager.nationality_id)
						const fieldsToRemove = [
							'city_id',
							'common_name',
							'country_id',
							'date_of_birth',
							'firstname',
							'gender',
							'height',
							'lastname',
							'name',
							'nationality_id',
							'player_id',
							'sport_id',
							'weight'
						];
						for (const field of fieldsToRemove) {
							delete manager[field];
						}
						let { data, error } = await supabase
							.from('active_managers')
							.upsert(manager)

						if (error){
							console.error('supa error: ', error)
						}
                    }
                }
				console.log('managers', managers)

            }catch(err){
                console.error(err)
            }


        }catch(err){
            console.error(err)
        }
    }

    async function insertPer90s(id, p90s){
        const { data, error } = await supabase
            .from('prem_stats_2425_per90')
            .upsert({
                id: id,
                ...p90s,
            }, { onConflict: 'id'})
            console.log(`player id ${id} uploaded`)
            if(error){
                console.error(error)
            }
    }


/////////////////////////
// API to Main Stat DB //
    async function getPremPlayersAndUpload() {
        console.log('Fetching Premier League players...');
        let lads = [];
        try {
            // Fetch all teams and players for the season
            const premRes = await axios.get('/api/teams/seasons/23614', {
                params: {
                    include: 'players.player;coaches'
                }
            });
            lads = premRes.data.data;
            console.log("Teams and Players:", lads);

            // Process each player sequentially
            for (const team of lads) {
                if (team.players && team.players.length > 0) {
                    for (const player of team.players) {
                        if (player.player.date_of_birth !== null) {
                            console.log(`Fetching stats for player ${player.player.id}...`);
                            await getPlayerStatsAndUpload(player.player.id, team.name); // Process each player one at a time
                        }
                    }
                }
            }
            console.log('Operation Success!')
            await getPlayersThenScore('prem_mini_2425')
            await statRankings()
        } catch (err) {
            console.error("Error fetching Premier League players:", err);
        }
    }

	async function getSinglePlayerApi(id){
		const response = await axios.get(`/api/players/${id}`, { 
                params: {
                    include: 'statistics.details.type;position;detailedPosition',
                    filter: 'playerStatisticSeasons:23614'
                }
            });

            const playerData = response.data.data;
            console.log("Player Data:", playerData);
	}


    async function getPlayerStatsAndUpload(id, teamName) {
		let seasonStats = null;
        try {
            // Fetch player data
            const response = await axios.get(`/api/players/${id}`, { 
                params: {
                    include: 'statistics.details.type;position;detailedPosition',
                    filter: 'playerStatisticSeasons:23614'
                }
            });

            const playerData = response.data.data;
            console.log("Player Data:", playerData);

            await delay(500); // Add a delay after each request

            if (playerData && playerData.statistics && playerData.statistics.length > 0) {
				if (playerData.statistics[0].details.length < 5 && playerData.statistics[1]){
					seasonStats = playerData.statistics[1]
				}else {
					seasonStats = playerData.statistics[0];
				}

                if (seasonStats.details.length > 1) {
                    // Initialize the stats object with common player data
                    const statsToInsert = {
                        id: playerData.id,
                        Position: playerData.position.name,
                        "Detailed Position": playerData.detailedposition && playerData.detailedposition.name ? playerData.detailedposition.name : null,
                        "Player Name": playerData.display_name,
                        "Player Team": teamName,
                        Age: calculateAge(playerData.date_of_birth),
                        Nation: getCountry(playerData.nationality_id)
                    };

                    if ((statsToInsert['Detailed Position']) === 'Right Midfield'){
                        (statsToInsert['Detailed Position']) = 'Central Midfield'
                    }
                    if ((statsToInsert['Detailed Position']) === 'Left Midfield'){
                        (statsToInsert['Detailed Position']) = 'Central Midfield'
                    }
                    if ((statsToInsert['Detailed Position']) === 'Secondary Striker'){
                        (statsToInsert['Detailed Position']) = 'Centre Forward'
                    }
                    if ((statsToInsert['Detailed Position']) === null){
						switch (statsToInsert.Position){
							case "Attacker":
								(statsToInsert['Detailed Position']) = 'Centre Forward'
								break;
							case "Midfielder":
								(statsToInsert['Detailed Position']) = 'Central Midfield'
								break;
							case "Defender":
								(statsToInsert['Detailed Position']) = 'Centre Back'
                                break;
							case "Goalkeeper":
								(statsToInsert['Detailed Position']) = 'Goalkeeper'
                                break;
						}
                    }

                    // Flatten the stats and add them to the object
                    seasonStats.details.forEach(stat => {
                        const { type, value } = stat;
                        const statName = type.name;

                        switch (statName) {
                            case 'Crosses Blocked':
                                // Use the `crosses_blocked` value from the nested object
                                if (value && typeof value === 'object' && value.crosses_blocked !== undefined) {
                                    statsToInsert[statName] = value.crosses_blocked;
                                }
                                break;

                            case 'Rating':
                                // Use the `average` value from the nested object
                                if (value && typeof value === 'object' && value.average !== undefined) {
                                    statsToInsert[statName] = value.average;
                                }
                                break;

                            case 'Substitutions':
                                // Use the `in` value from the nested object
                                if (value && typeof value === 'object' && value.in !== undefined) {
                                    statsToInsert[statName] = value.in;
                                }
                                break;

                            case 'Average Points Per Game':
                                // Use the `average` value from the nested object 
                                if (value && typeof value === 'object' && value.average !== undefined) {
                                    statsToInsert[statName] = value.average;
                                }
                                break; 
                            default:
                                // For all other stats, use the `total` value if it exists, otherwise use the value as-is
                                if (value && typeof value === 'object' && value.total !== undefined) {
                                    statsToInsert[statName] = value.total;
                                } else {
                                    statsToInsert[statName] = value;
                                }
                                break;
                        }
                    });

                    console.log("Stats to Insert:", statsToInsert);

                    // Perform a single insert operation with the complete stats object
                    const { error } = await supabase
                        .from('prem_stats_2425') 
                        .upsert([statsToInsert]);

                    if (error) {
                        console.error(`Error inserting stats for player ${playerData.display_name}:`, error);
                        console.error(`ID ${playerData.id}`, statsToInsert);
                    } else {
                        console.log(`Successfully inserted stats for player ${playerData.display_name}`);
                    }
                }
            } else {
                console.log("No statistics found for this player:", id);
            }
        } catch (error) {
            console.error("Error fetching player stats:", error);
        }
    }
//End of API to Main Stat DB //
//////////////////////////////

//////////////////////////////
//Testing Section ////////////
    async function testWeightMap(){
        await fetchAllWeights()

        if(weightsFetched){
            let { data: player, error } = await supabase
                    .from('prem_stats_2425')
                    .select('*')
                    .limit(1)
                    .single()

            getDefensiveScore(player, player['Detailed Position'], defenseWeightMap)

        }

        }

////////////////////////////
//Player Calculations /////    
function getKeeperScore(row, detailedPosition){
    const weights = keepingWeightMap[detailedPosition]
    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }

    const stats = {
        AerialsWon: row['Aerials Won'] || 0,
        Cleansheets: row['Cleansheets'] || 0,
        Clearances: row['Clearances'] || 0,
        GoalsConceded: row['Goals Conceded'] || 0,
        ErrorLeadToGoal: row['Error Lead To Goal'] || 0,
        FoulsDrawn: row['Fouls Drawn'] || 0,
        Fouls: row['Fouls'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        DuelsWon: row['Duels Won'] || 0,
        TotalDuels: row['Total Duels'] || 0,
        Saves: row['Saves'] || 0,
        SavesInsideBox: row['Saves Insidebox'] || 0
    }

    const minutesPlayed = row['Minutes Played'] || 0;

    const duelsWonPercentage = stats.TotalDuels > 0 ? (stats.DuelsWon / stats.TotalDuels) * 100 : 0;

    const per90Stats = {}
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'Cleansheets' && key !== 'ErrorLeadToGoal') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }

    per90Stats.DuelsWonPercentage = duelsWonPercentage;

    let keepingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        keepingScore += (per90Stats[key] || 0) * weight;
    }

    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    keepingScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        keepingScore = keepingScore * minutesPercentage;
    }

    keepingScore = (keepingScore / 10).toFixed(2)
    keepingScore = capScore(keepingScore)
    console.log('keeping score', keepingScore)
    return {
        score: keepingScore,
        p90s: per90Stats
    }
}

function getAttackingScore(row, detailedPosition) {
    const weights = attackingWeightMap[detailedPosition];
    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }
    const stats = {
        AccuratePasses: row['Accurate Passes'] || 0,
        Assists: row.Assists || 0,
        BigChancesCreated: row['Big Chances Created'] || 0,
        BigChancesMissed: row['Big Chances Missed'] || 0,
        Goals: row['Goals'] || 0,
        HitWoodwork: row['Hit Woodwork'] || 0,
        BlockedShots: row['Blocked Shots'] || 0,
        ShotsOffTarget: row['Shots Off Target'] || 0,
        ShotsOnTarget: row['Shots On Target'] || 0,
        SuccessfulDribbles: row['Successful Dribbles'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        ThroughBallsWon: row['Through Balls Won'] || 0,
        Offsides: row['Offsides'] || 0
    };
    
    const minutesPlayed = row['Minutes Played'] || 0;

    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
    }

    let attackingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        attackingScore += (per90Stats[key] || 0) * weight;
    }

    // Apply consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    attackingScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        attackingScore = attackingScore * minutesPercentage;
    }

    attackingScore = (attackingScore * 2).toFixed(2);
    attackingScore = capScore(attackingScore)
    return {
        score: attackingScore,
        p90s: per90Stats
    }
}

function getPossessionScore(row, detailedPosition) {
    const weights = possessionWeightMap[detailedPosition];
    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }
    const stats = {
        AccuratePasses: row['Accurate Passes'] || 0,
        AccuratePassesPercentage: row['Accurate Passes Percentage'] || 0,
        Passes: row['Passes'] || 0,
        SuccessfulDribbles: row['Successful Dribbles'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        Dispossessed: row['Dispossessed'] || 0,
        Fouls: row['Fouls'] || 0,
        FoulsDrawn: row['Fouls Drawn'] || 0,
        ShotsOnTarget: row['Shots Off Target'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        ThroughBallsWon: row['Through Balls Won'] || 0,
        Offsides: row['Offsides'] || 0
    };

    const minutesPlayed = row['Minutes Played'] || 0;
    
    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'AccuratePassesPercentage') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }

    let possessionScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        possessionScore += (per90Stats[key] || 0) * weight;
    }

    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    possessionScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        possessionScore = possessionScore * minutesPercentage;
    }

    possessionScore = (possessionScore / 30) * stats.AccuratePassesPercentage

    if(possessionScore <= 100){
        possessionScore = stats.AccuratePassesPercentage
    }

    possessionScore = (possessionScore).toFixed(2);
    possessionScore = capScore(possessionScore)
    return {
        score: possessionScore,
        p90s: per90Stats
    }
}

function getPassingScore(row, detailedPosition) {
    const weights = passingWeightMap[detailedPosition];

    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }

    const stats = {
        BigChancesCreated: row['Big Chances Created'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        AccuratePassesPercentage: row['Accurate Passes Percentage'] || 0,
        Passes: row['Passes'] || 0,
        Assists: row['Assists'] || 0,
        AccurateCrosses: row['Accurate Crosses'] || 0,
        ThroughBalls: row['Through Balls'] || 0,
    };

    const minutesPlayed = row['Minutes Played'] || 0;

    // Calculate regular per90 stats
    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'AccuratePassesPercentage') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }
    let passingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        passingScore += (per90Stats[key] || 0) * weight;
    }

    // Add consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    passingScore += consistencyBonus;

    // Apply rating adjustments
    const rating = row.Rating || 0;
    if (rating >= 7.2) {
        passingScore += (rating - 7.1) * 100;
    } else if (rating >= 7.0) {
        passingScore += (rating - 6.9) * 75;
    } else if (rating < 6.5) {
        passingScore -= (6.5 - rating) * 100;
    } else if (rating < 6.7) {
        passingScore -= (6.7 - rating) * 75;
    }

    // Add bonus for high passing accuracy
    // const accuratePassesPercentage = per90Stats.AccuratePassesPercentage || 0;
    // if (accuratePassesPercentage >= 90) {
    //     const bonusMultiplier = Math.pow((accuratePassesPercentage - 90), 2);
    //     passingScore += 35 + (bonusMultiplier * 10);
    // } else if (accuratePassesPercentage >= 86) {
    //     passingScore += 25;
    // }

    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        passingScore = passingScore * minutesPercentage;
    }
    if(detailedPosition === 'Goalkeeper'){
        passingScore *= 4
    }
    passingScore = passingScore.toFixed(2)
    passingScore = capScore(passingScore)
    return {
        score: passingScore,
        p90s: per90Stats
    }
}

        
function getDefensiveScore(row, detailedPosition) {
    const weights = defenseWeightMap[detailedPosition];
    // console.log(`weights: `, weights)
    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }

    const stats = {
        Tackles: row.Tackles || 0,
        Fouls: row.Fouls || 0,
        CrossesBlocked: row['Crosses Blocked'] || 0,
        Interceptions: row.Interceptions || 0,
        ShotsBlocked: row['Shots Blocked'] || 0,
        Cleansheets: row.Cleansheets || 0,
        GoalsConceded: row['Goals Conceded'] || 0,
        Clearances: row.Clearances || 0,
        AerialsWon: row['Aerials Won'] || 0,
        DuelsWon: row['Duels Won'] || 0,
        TotalDuels: row['Total Duels'] || 0,
        ErrorLeadToGoal: row['Error Lead To Goal'] || 0,
        DribbledPast: row['Dribbled Past'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
    };

    const minutesPlayed = row['Minutes Played'] || 0;

    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'Cleansheets' && key !== 'ErrorLeadToGoal') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }

    // console.log('Per 90 Stats:', per90Stats);

    const duelsWonPercentage = stats.TotalDuels > 0 ? (stats.DuelsWon / stats.TotalDuels) * 100 : 0;

    per90Stats.DuelsWonPercentage = duelsWonPercentage;

    let defensiveScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        defensiveScore += (per90Stats[key] || 0) * weight;
    }

    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    defensiveScore += consistencyBonus;

    const rating = row.Rating || 0;

    if (rating >= 7.2) {
        defensiveScore += (rating - 7.1) * 100;
    } else if (rating >= 7.0) {
        defensiveScore += (rating - 6.9) * 75;
    } else if (rating < 6.5) {
        defensiveScore -= (6.5 - rating) * 100;
    } else if (rating < 6.7) {
        defensiveScore -= (6.7 - rating) * 75;
    }

    // Dribbled Past Adjustment (Non-linear penalty)
    const dribbledPast = per90Stats.DribbledPastPer90 || 0;
    let dribbledPastPenalty = 0;

    
    if (dribbledPast > 0) {
        const basePenalty = 20; // Penalty for even being dribbled past once
        const scaleFactor = 30;  // Adjust steepness of the curve
        const exponent = 2;      // Adjust the shape of the curve (higher = faster increase)
        const maxPenalty = 250;    // Cap on the penalty

        dribbledPastPenalty = Math.min(basePenalty + scaleFactor * Math.pow(dribbledPast, exponent), maxPenalty);
        defensiveScore -= dribbledPastPenalty;
    }

    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        defensiveScore = defensiveScore * minutesPercentage;
    }

    defensiveScore = (defensiveScore * 0.8).toFixed(2)
    defensiveScore = capScore(defensiveScore)
    return {
        score: defensiveScore,
        p90s: per90Stats
    }
}

/////////////////
//Stat Rankings//
async function statRankings() {
    const invertedStats = [
        "ShotsOffTargetPer90",
        "BigChancesMissedPer90",
        "FoulsPer90",
        "OffsidesPer90",
        "GoalsConcededPer90",
        "DispossessedPer90",
        "DribbledPastPer90",
        "ErrorLeadToGoal"
    ];

    const { data, error } = await supabase
        .from('prem_stats_2425_per90')
        .select('*');
    if (error) {
        console.error(error);
        return;
    }

    // Only get rankings for players with significant minutes (half of the maximum or greater)
    const maxMinutes = Math.max(...data.map(player => player.MinutesPlayed));
    const minutesThreshold = maxMinutes / 3;
    const filteredPlayers = data.filter(player => player.MinutesPlayed >= minutesThreshold);

    // Separate players into keepers and non-keepers
    const keepers = filteredPlayers.filter(player => player.DetailedPosition === 'Goalkeeper');
    const nonKeepers = filteredPlayers.filter(player => player.DetailedPosition !== 'Goalkeeper');

    // Initialize rankedData for all players
    const rankedData = filteredPlayers.map(player => ({
        id: player.id,
        PlayerName: player.PlayerName,
        DetailedPosition: player.DetailedPosition,
        ...statsToRank.reduce((acc, stat) => {
            acc[stat] = 0; // Initialize all stats to 0
            return acc;
        }, {}),
        ...keeperStatsToRank.reduce((acc, stat) => {
            acc[stat] = 0; // Initialize keeper stats to 0
            return acc;
        }, {})
    }));

    // Helper function to rank players with tie handling
    const rankPlayers = (players, stat, isInverted) => {
        const sortedPlayers = [...players].sort((a, b) => isInverted ? a[stat] - b[stat] : b[stat] - a[stat]);

        let currentRank = 1;
        let previousValue = null;
        let firstRankSet = false

        sortedPlayers.forEach((player, index) => {
            const playerInRankedData = rankedData.find(p => p.id === player.id);
            const currentValue = player[stat];

            if (currentValue !== previousValue && !firstRankSet){
                currentRank = 1
                firstRankSet = true;
            }
            else if (currentValue !== previousValue) {
                currentRank += 1; // Update rank if the value changes
            }

            if (currentRank <= 50) {
                playerInRankedData[stat] = currentRank; // Top 50
            } else if (currentRank >= sortedPlayers.length - 49) {
                playerInRankedData[stat] = -(sortedPlayers.length - currentRank + 1); // Bottom 50
            } else {
                playerInRankedData[stat] = 0; // Not in top or bottom 50
            }

            previousValue = currentValue; // Update previous value for the next iteration
        });
    };

    // Rank non-keepers using statsToRank
    statsToRank.forEach(stat => {
        const isInverted = invertedStats.includes(stat);
        rankPlayers(nonKeepers, stat, isInverted);
    });

    // Rank keepers using keeperStatsToRank
    keeperStatsToRank.forEach(stat => {
        const isInverted = invertedStats.includes(stat);
        rankPlayers(keepers, stat, isInverted);
    });

    console.log(rankedData);

    const { rankings, err } = await supabase
        .from('prem_stats_2425_rankings')
        .upsert(rankedData, { onConflict: 'id' })
    if (err) {
        console.error(err);
    } else {
        console.log('Rankings uploaded');
    }
}

async function getNations() {
  // This object will accumulate name→image_path
  const nameImageMap = {};

  try {
    // 1) Loop pages starting at 1
    for (let page = 1; ; page++) {
      const resp = await axios.get('/core/countries/', {
        params: { page }
      });

      // resp.data has shape { data: [...countries], pagination: { has_more, ... } }
      const { data: countries, pagination } = resp.data;

      // 2) Add each country’s name→image_path into our map
      countries.forEach(country => {
        nameImageMap[country.name] = country.image_path;
      });

      // 3) Break when there’s no more pages
      if (!pagination.has_more) {
        break;
      }
    }

    // 4) Log the final map
    console.log('🌍 Country → Image map:', nameImageMap);

    return nameImageMap;

  } catch (err) {
    console.error('Error fetching nations', err);
    // return an empty map on error
    return {};
  }
}

function toggleDevBar() {
    devBarVisible = !devBarVisible;
  }
</script>

<div class="dev-bar-toggle">
    <button class="dev-button" onclick={toggleDevBar}>Toggle Dev Bar</button>
</div>
  


{#if devBarVisible}
    <div class="dev-bar">
        <button onclick={getPremPlayersAndUpload}>Let's Go</button>
        <button onclick={getSinglePlayerApi(1743)}>Player by ID - API</button>
        <button onclick={getPlayersThenScore('prem_mini_2425')}>Upload Scores to Mini</button>
        <button onclick={getPlayersThenScore('prem_mini_2425_testing')}>Upload Scores to Mini TEST</button>
        <button onclick={fetchAllWeights}>Weights</button>
        <button onclick={testWeightMap}>Test Weight to Defense</button>
        <button onclick={statRankings}>Stat Rankings</button>
        <button onclick={getCoachesToDB}>Managers to DB</button>
        <button onclick={getNations}>Nations</button>
    </div>  
{/if}
{#if userStore.user}
    <h2>Signed in as {userStore.user ? userStore.user.signInDetails.loginId : null}</h2>
    <button onclick={signUserOut}>Logout</button>
{/if}
<button><a href="/">Home</a></button>
<button><a href="/draft">To Draft</a></button>
{#if draft.gate1}
  <button>
    <a
      href={'/table'
      }
    >
      League Table
    </a>
  </button>
{/if}
<style>
 button {
    display: inline-block;
    margin-right: 2rem;
    padding: 0.75rem 1.5rem;       
    font-family: inherit;          
    font-size: 1rem;             
    line-height: 1.2;
    color: #ffffff;             
    background-color: #007BFF;    
    border: none;                 
    border-radius: 0.375rem;     
    cursor: pointer;               
    text-align: center;
    text-decoration: none;
    transition:
      background-color 0.2s ease-in-out,
      transform 0.1s ease-in-out
  }
  
  button:hover {
    background-color: #0056B3;    
  }
  
  button:active {
    transform: scale(0.98);       
  }

  .dev-button {
    background-color: #aed384;
    margin-bottom: 1rem;
  }
</style>


{@render children()}
