<script>
	import axios from "axios";
    import '../app.css';
    import { Amplify } from 'aws-amplify';
    import amplifyConfig from "$lib/client/aws/amplifyConfig";
	import { onMount } from "svelte";
    import { getCurrentUser, signOut } from "aws-amplify/auth";
    import { statsToRank, keeperStatsToRank } from "$lib/data/statsToRank";
    import { supabase } from "$lib/client/supabase/supaClient";
    import { delay, calculateAge } from "$lib/utils";
    import { getCountry } from '$lib/data/countries';
    import { allPlayers, outfieldAverages, keeperAverages, defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, finishingWeightMap, defenseImpMap, passingImpMap, possessionImpMap, attackingImpMap, keepingImpMap, finishingImpMap } from "$lib/stores/generic.svelte";
	import { draft } from "$lib/stores/draft.svelte";
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
    let devBarVisible = $state(false)

    function capScore(score) {
        return Math.min(score, 5000);
    }

    async function getPlayerPicture(id) {
    try {
        const lad = await axios.get(`/api/players/${id}`);
        if(lad){
            return lad.data.data.image_path;
        }
    } catch(err){
        console.error(err)
    }
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
            getWeightsFromTable('getAttackingScore', attackingWeightMap, attackingImpMap),
            getWeightsFromTable('getFinishingScore', finishingWeightMap, finishingImpMap )
        ])

        weightsFetched = true
    }


    async function getPlayerImages(leagueId, miniDB) {
        const table = leagueIdConfig[leagueId[0]]
        try {
            let { data: players, error } = await supabase
                .from(table)
                .select('*')

            if (error) {
                console.error('Error fetching players:', error);
                return;
            }

            console.log(`Fetched ${players.length} players.`);

            for (const player of players) {

                console.log(`Getting image for player: ${player["Player Name"]}`);

                const imageURL = await getPlayerPicture(player["id"])

                const { error: upsertError } = await supabase
                    .from(miniDB)
                    .upsert({
                        id: player.id,
                        image_path: imageURL
                    }, {
                        onConflict: 'id'
                    })

                    if (upsertError) {
                        console.error(`Error upserting image for player ${player["Player Name"]}:`, upsertError);
                    } else {
                        console.log(`Successfully updated image_path for ${player["Player Name"]}`);
                    }

                await delay(400)
            }
        } catch (err){
            console.error(err)
        }
    }

 async function populatePlayerSeasonLog(lastSeason = '2425', currentSeason = '2526') {
    // Hash map to store player IDs with their season information
    const playerSeasonMap = new Map();
    
    // Define leagues and their corresponding season IDs
    const leagues = ['bundes', 'laliga', 'ligue1', 'prem', 'seriea'];
    
    const lastSeasonData = [
        { leagueId: 23744, league: 'bundes', season: '2425' },
        { leagueId: 23621, league: 'laliga', season: '2425' },
        { leagueId: 23643, league: 'ligue1', season: '2425' },
        { leagueId: 23614, league: 'prem', season: '2425' },
        { leagueId: 23746, league: 'seriea', season: '2425' }
    ];
    
    const currentSeasonData = [
        { leagueId: 25646, league: 'bundes', season: '2526' },
        { leagueId: 25659, league: 'laliga', season: '2526' },
        { leagueId: 25651, league: 'ligue1', season: '2526' },
        { leagueId: 25583, league: 'prem', season: '2526' },
        { leagueId: 25533, league: 'seriea', season: '2526' }
    ];
    
    console.log(`Starting to process last season (${lastSeason}) data...`);
    
    // Process last season data
    for (const leagueInfo of lastSeasonData) {
        const tableName = `${leagueInfo.league}_stats_${leagueInfo.season}`;
        console.log(`Processing table: ${tableName}`);
        
        try {
            // Fetch all player IDs and names from the table
            const { data: players, error } = await supabase
                .from(tableName)
                .select('id, "Player Name"');
            
            if (error) {
                console.error(`Error fetching from ${tableName}:`, error);
                continue;
            }
            
            // Add each player to the hash map with their season ID and name
            for (const player of players) {
                if (!playerSeasonMap.has(player.id)) {
                    playerSeasonMap.set(player.id, {
                        'Player Name': player['Player Name'],
                        [lastSeason]: leagueInfo.leagueId,
                        [currentSeason]: null
                    });
                }
            }
            
            console.log(`Found ${players.length} players in ${tableName}`);
        } catch (err) {
            console.error(`Error processing ${tableName}:`, err);
        }
    }
    
    console.log(`Total unique players from last season: ${playerSeasonMap.size}`);
    console.log(`Starting to process current season (${currentSeason}) data...`);
    
    // Process current season data
    for (const leagueInfo of currentSeasonData) {
        const tableName = `${leagueInfo.league}_stats_${leagueInfo.season}`;
        console.log(`Processing table: ${tableName}`);
        
        try {
            // Fetch all player IDs and names from the table
            const { data: players, error } = await supabase
                .from(tableName)
                .select('id, "Player Name"');
            
            if (error) {
                console.error(`Error fetching from ${tableName}:`, error);
                continue;
            }
            
            // Update existing players or add new ones
            for (const player of players) {
                if (playerSeasonMap.has(player.id)) {
                    // Player existed last season, update their current season
                    const playerData = playerSeasonMap.get(player.id);
                    playerData[currentSeason] = leagueInfo.leagueId;
                    // Update name in case it changed (unlikely but possible)
                    playerData['Player Name'] = player['Player Name'];
                } else {
                    // New player this season only
                    playerSeasonMap.set(player.id, {
                        'Player Name': player['Player Name'],
                        [lastSeason]: null,
                        [currentSeason]: leagueInfo.leagueId
                    });
                }
            }
            
            console.log(`Found ${players.length} players in ${tableName}`);
        } catch (err) {
            console.error(`Error processing ${tableName}:`, err);
        }
    }
    
    console.log(`Total unique players across both seasons: ${playerSeasonMap.size}`);
    console.log('Preparing data for insertion...');
    
    // Convert hash map to array for batch insert
    const playerSeasonLogData = Array.from(playerSeasonMap.entries()).map(([playerId, data]) => ({
        id: playerId,
        'Player Name': data['Player Name'],
        [lastSeason]: data[lastSeason],
        [currentSeason]: data[currentSeason]
    }));
    
    console.log(`Inserting ${playerSeasonLogData.length} records into player_season_log table...`);
    
    // Batch insert into player_season_log table
    // Using upsert in case we need to run this multiple times
    const batchSize = 1000; // Supabase has limits on batch operations
    let inserted = 0;
    
    for (let i = 0; i < playerSeasonLogData.length; i += batchSize) {
        const batch = playerSeasonLogData.slice(i, i + batchSize);
        
        const { data, error } = await supabase
            .from('player_season_log')
            .upsert(batch, { 
                onConflict: 'id',
                ignoreDuplicates: false 
            });
        
        if (error) {
            console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        } else {
            inserted += batch.length;
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${playerSeasonLogData.length} records)`);
        }
    }
    
    console.log('Population complete!');
    console.log(`Total records inserted/updated: ${inserted}`);
    
    // Return summary statistics
    return {
        totalPlayers: playerSeasonMap.size,
        playersInBothSeasons: Array.from(playerSeasonMap.values()).filter(p => p[lastSeason] && p[currentSeason]).length,
        playersOnlyLastSeason: Array.from(playerSeasonMap.values()).filter(p => p[lastSeason] && !p[currentSeason]).length,
        playersOnlyCurrentSeason: Array.from(playerSeasonMap.values()).filter(p => !p[lastSeason] && p[currentSeason]).length
    };
}

async function calculatePer90s(leagueString, seasonString) {
    console.log(`Starting per90 calculation for league: ${leagueString}, season: ${seasonString}`);
    
    const statTable = `${leagueString}_stats_${seasonString}`
    const ninetyTable = `${leagueString}_stats_${seasonString}_per90`

    console.log(`Tables - stat: ${statTable}, ninety: ${ninetyTable}`);

    try {
        let { data: players, error } = await supabase
            .from(statTable)
            .select('*');

        if (error) {
            console.error(`ERROR fetching players from ${statTable}:`, error);
            return;
        }

        if (!players || players.length === 0) {
            console.warn(`No players found in ${statTable}`);
            return;
        }

        console.log(`Fetched ${players.length} players from ${statTable}`);

        let processedCount = 0;
        let skippedCount = 0;
        const skippedPlayers = [];

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            console.log(`Processing player ${i + 1}/${players.length}: ${player["Player Name"]} (ID: ${player.id})`);

            try {
                await delay(500);
                
                if (!player.id) {
                    console.error(`Player ${player["Player Name"]} has no ID - skipping`);
                    skippedCount++;
                    skippedPlayers.push(player["Player Name"]);
                    continue;
                }

                if (!player["Player Name"]) {
                    console.error(`Player ID ${player.id} has no name - skipping`);
                    skippedCount++;
                    skippedPlayers.push(`ID: ${player.id}`);
                    continue;
                }

                const minutesPlayed = player["Minutes Played"] || 0;
                const isKeeper = player.Position === 'Goalkeeper';

                // Create minimal entry for low-minute players
                if (minutesPlayed < 70) {
                    console.log(`${player["Player Name"]} - Only ${minutesPlayed} minutes played, creating minimal per90 entry`);
                    
                    const minimalP90s = {
                        PlayerName: player["Player Name"],
                        PlayerTeam: player["Player Team"],
                        MinutesPlayed: minutesPlayed,
                        Position: player.Position,
                        DetailedPosition: player["Detailed Position"]
                    };
                    
                    await insertPer90s(ninetyTable, player.id, minimalP90s);
                    processedCount++;
                    continue;
                }

                // Calculate all per90 stats
                const per90Factor = minutesPlayed > 0 ? 90 / minutesPlayed : 0;
                
                const p90s = {
                    PlayerName: player["Player Name"],
                    PlayerTeam: player["Player Team"],
                    MinutesPlayed: minutesPlayed,
                    Position: player.Position,
                    DetailedPosition: player["Detailed Position"],
                    
                    // Defensive per90s
                    TacklesPer90: player.Tackles ? (player.Tackles * per90Factor).toFixed(4) : 0,
                    FoulsPer90: player.Fouls ? (player.Fouls * per90Factor).toFixed(4) : 0,
                    CrossesBlockedPer90: player['Crosses Blocked'] ? (player['Crosses Blocked'] * per90Factor).toFixed(4) : 0,
                    InterceptionsPer90: player.Interceptions ? (player.Interceptions * per90Factor).toFixed(4) : 0,
                    ShotsBlockedPer90: player['Shots Blocked'] ? (player['Shots Blocked'] * per90Factor).toFixed(4) : 0,
                    Cleansheets: player.Cleansheets || 0, // Not per90
                    GoalsConcededPer90: player['Goals Conceded'] ? (player['Goals Conceded'] * per90Factor).toFixed(4) : 0,
                    ClearancesPer90: player.Clearances ? (player.Clearances * per90Factor).toFixed(4) : 0,
                    AerialsWonPer90: player['Aerials Won'] ? (player['Aerials Won'] * per90Factor).toFixed(4) : 0,
                    DuelsWonPer90: player['Duels Won'] ? (player['Duels Won'] * per90Factor).toFixed(4) : 0,
                    TotalDuelsPer90: player['Total Duels'] ? (player['Total Duels'] * per90Factor).toFixed(4) : 0,
                    ErrorLeadToGoal: player['Error Lead To Goal'] || 0, // Not per90
                    DribbledPastPer90: player['Dribbled Past'] ? (player['Dribbled Past'] * per90Factor).toFixed(4) : 0,
                    LongBallsWonPer90: player['Long Balls Won'] ? (player['Long Balls Won'] * per90Factor).toFixed(4) : 0,
                    
                    // Passing per90s
                    BigChancesCreatedPer90: player['Big Chances Created'] ? (player['Big Chances Created'] * per90Factor).toFixed(4) : 0,
                    KeyPassesPer90: player['Key Passes'] ? (player['Key Passes'] * per90Factor).toFixed(4) : 0,
                    AccuratePassesPercentage: player['Accurate Passes Percentage'] || 0, // Not per90
                    PassesPer90: player['Passes'] ? (player['Passes'] * per90Factor).toFixed(4) : 0,
                    AssistsPer90: player['Assists'] ? (player['Assists'] * per90Factor).toFixed(4) : 0,
                    AccurateCrossesPer90: player['Accurate Crosses'] ? (player['Accurate Crosses'] * per90Factor).toFixed(4) : 0,
                    ThroughBallsPer90: player['Through Balls'] ? (player['Through Balls'] * per90Factor).toFixed(4) : 0,
                    
                    // Possession per90s
                    AccuratePassesPer90: player['Accurate Passes'] ? (player['Accurate Passes'] * per90Factor).toFixed(4) : 0,
                    SuccessfulDribblesPer90: player['Successful Dribbles'] ? (player['Successful Dribbles'] * per90Factor).toFixed(4) : 0,
                    DispossessedPer90: player['Dispossessed'] ? (player['Dispossessed'] * per90Factor).toFixed(4) : 0,
                    FoulsDrawnPer90: player['Fouls Drawn'] ? (player['Fouls Drawn'] * per90Factor).toFixed(4) : 0,
                    ShotsOffTargetPer90: player['Shots Off Target'] ? (player['Shots Off Target'] * per90Factor).toFixed(4) : 0,
                    ThroughBallsWonPer90: player['Through Balls Won'] ? (player['Through Balls Won'] * per90Factor).toFixed(4) : 0,
                    OffsidesPer90: player['Offsides'] ? (player['Offsides'] * per90Factor).toFixed(4) : 0,
                    
                    // Attacking per90s  
                    GoalsPer90: player['Goals'] ? (player['Goals'] * per90Factor).toFixed(4) : 0,
                    ShotsOnTargetPer90: player['Shots On Target'] ? (player['Shots On Target'] * per90Factor).toFixed(4) : 0,
                    
                    // Finishing per90s
                    BigChancesMissedPer90: player['Big Chances Missed'] ? (player['Big Chances Missed'] * per90Factor).toFixed(4) : 0,
                    HitWoodworkPer90: player['Hit Woodwork'] ? (player['Hit Woodwork'] * per90Factor).toFixed(4) : 0,
                    BlockedShotsPer90: player['Blocked Shots'] ? (player['Blocked Shots'] * per90Factor).toFixed(4) : 0,
                    
                    // Keeper per90s (will be 0 for outfield players)
                    SavesPer90: player['Saves'] ? (player['Saves'] * per90Factor).toFixed(4) : 0,
                    SavesInsideBoxPer90: player['Saves Insidebox'] ? (player['Saves Insidebox'] * per90Factor).toFixed(4) : 0,
                };

                // Calculate duels won percentage
                const duelsWonPercentage = player['Total Duels'] > 0 
                    ? ((player['Duels Won'] || 0) / player['Total Duels'] * 100).toFixed(2) 
                    : 0;
                p90s.DuelsWonPercentage = duelsWonPercentage;

                console.log(`${player["Player Name"]} - Inserting per90s data to ${ninetyTable}`);
                await insertPer90s(ninetyTable, player.id, p90s);
                
                processedCount++;
                console.log(`Successfully processed player ${player["Player Name"]} (ID: ${player.id})`);
                
            } catch(playerErr) {
                console.error(`ERROR processing player ${player["Player Name"]} (ID: ${player.id}):`, playerErr);
                skippedCount++;
                skippedPlayers.push(player["Player Name"]);
            }
        }

        console.log(`FINAL SUMMARY:`);
        console.log(`Total players in initial data: ${players.length}`);
        console.log(`Successfully processed: ${processedCount}`);
        console.log(`Skipped/Failed: ${skippedCount}`);
        if (skippedPlayers.length > 0) {
            console.log(`Skipped players:`, skippedPlayers);
        }

        console.log(`All players processed and per90s uploaded.`);
        
    } catch (err) {
        console.error(`CRITICAL ERROR in main function:`, err);
        console.error(`Error stack:`, err.stack);
    }
}





//    async function getPlayersThenScore(leagueString, seasonString) {
//     console.log(`[getPlayersThenScore] Starting for league: ${leagueString}, season: ${seasonString}`);
    
//     await fetchAllWeights()

//     const statTable = `${leagueString}_stats_${seasonString}`
//     const ninetyTable = `${leagueString}_stats_${seasonString}_per90`
//     const miniTable = `${leagueString}_mini_${seasonString}`

//     console.log(`[getPlayersThenScore] Tables - stat: ${statTable}, ninety: ${ninetyTable}, mini: ${miniTable}`);

//     if(weightsFetched){
//         console.log(`[getPlayersThenScore] Weights fetched successfully`);
//         try {
//             let { data: players, error } = await supabase
//                 .from(statTable)
//                 .select('*');

//             if (error) {
//                 console.error(`[getPlayersThenScore] CRITICAL ERROR fetching players from ${statTable}:`, error);
//                 console.error(`[getPlayersThenScore] Error details:`, JSON.stringify(error));
//                 return;
//             }

//             if (!players || players.length === 0) {
//                 console.warn(`[getPlayersThenScore] No players found in ${statTable}`);
//                 return;
//             }

//             console.log(`[getPlayersThenScore] Fetched ${players.length} players from ${statTable}`);

//             let processedCount = 0;
//             let skippedCount = 0;
//             const skippedPlayers = [];

//             for (let i = 0; i < players.length; i++) {
//                 const player = players[i];
//                 console.log(`[getPlayersThenScore] Processing player ${i + 1}/${players.length}: ${player["Player Name"]} (ID: ${player.id})`);

//                 try {
//                     await delay(500);
                    
//                     if (!player.id) {
//                         console.error(`[getPlayersThenScore] Player ${player["Player Name"]} has no ID - skipping`);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }

//                     if (!player["Player Name"]) {
//                         console.error(`[getPlayersThenScore] Player ID ${player.id} has no name - skipping`);
//                         skippedCount++;
//                         skippedPlayers.push(`ID: ${player.id}`);
//                         continue;
//                     }

//                     const playerData = {
//                         id: player.id,
//                         player_name: player["Player Name"],
//                         position: player.Position,
//                         detailed_position: player["Detailed Position"],
//                         keeper_score: null,
//                         defensive_score: null,
//                         passing_score: null,
//                         possession_score: null,
//                         attacking_score: null,
//                         finishing_score: null,
//                         total_score: null,
//                         transfer_value: null,
//                         player_age: null
//                     };

//                     console.log(`[getPlayersThenScore] Player ${player["Player Name"]} - Position: ${player.Position}, Detailed: ${player["Detailed Position"]}`);

//                     // Skip scoring for players with less than 135 minutes
//                     const minutesPlayed = player["Minutes Played"] || 0;
//                     if (minutesPlayed < 250) {
//                         console.log(`[getPlayersThenScore] ${player["Player Name"]} - Only ${minutesPlayed} minutes played, skipping scoring and setting defaults`);
                        
//                         playerData.defensive_score = 0;
//                         playerData.passing_score = 0;
//                         playerData.possession_score = 0;
//                         playerData.attacking_score = 0;
//                         playerData.finishing_score = 0;
//                         playerData.keeper_score = 0;
//                         playerData.total_score = 0;
//                         playerData.transfer_value = 500;
//                         playerData.player_age = player.Age;
//                         playerData.player_team = player["Player Team"];
//                         playerData.nationality = player.Nation;
                        
//                         // Still need to create minimal per90s entry for consistency
//                         const minimalP90s = {
//                             PlayerName: playerData.player_name,
//                             PlayerTeam: player["Player Team"],
//                             MinutesPlayed: minutesPlayed,
//                             Position: playerData.position,
//                             DetailedPosition: playerData.detailed_position
//                         };
                        
//                         await insertPer90s(ninetyTable, player.id, minimalP90s);
                        
//                         const { error: uploadError } = await supabase
//                             .from(miniTable)
//                             .upsert([playerData]);

//                         if (uploadError) {
//                             console.error(`[getPlayersThenScore] ERROR uploading minimal scores for player ${player["Player Name"]} (ID: ${player.id}) to ${miniTable}:`, uploadError);
//                             skippedCount++;
//                             skippedPlayers.push(player["Player Name"]);
//                         } else {
//                             console.log(`[getPlayersThenScore] Successfully uploaded minimal scores for low-minutes player ${player["Player Name"]} (ID: ${player.id})`);
//                             processedCount++;
//                         }
                        
//                         continue; 
//                     }

//                     let finishing = null;
//                     let attacking = null;
//                     let keeping = null;
//                     let passing = null;
//                     let defense = null;
//                     let possession = null;
//                     let total = 0;
//                     const isKeeper = player.Position === 'Goalkeeper';
//                     const isMidfielder = player.Position === 'Midfielder';
//                     const isAttacker = player.Position === 'Attacker';
//                     const isCB = player["Detailed Position"] === 'Centre-Back';
//                     const isFullback = player["Detailed Position"] === 'Left-Back' || player["Detailed Position"] === 'Right-Back';

//                 if (!isKeeper) {
//                     console.log(`[getPlayersThenScore] Processing outfield player: ${player["Player Name"]}`);
                    
//                     try {
//                         defense = getDefensiveScore(player, player["Detailed Position"]);
//                         if(!isCB || !isFullback){
//                             defense.score *= 0.7
//                         }
//                         if (!defense || !defense.score || defense.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Defense score is null/undefined/too small: ${defense?.score}`);
//                             console.log('setting minimal default defensive score of 10');
//                             defense = defense || {};
//                             defense.score = 10;
//                             defense.p90s = defense.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Defense score: ${defense?.score}`);
//                             total += parseFloat(defense.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting defense score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }
                  
//                     try {
//                         passing = getPassingScore(player, player["Detailed Position"]);
//                         if (!passing || !passing.score || passing.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Passing score is null/undefined/too small: ${passing?.score}`);
//                             console.log('setting minimal default passing score of 10');
//                             passing = passing || {};
//                             passing.score = 10;
//                             passing.p90s = passing.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Passing score: ${passing?.score}`);
//                             total += parseFloat(passing.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting passing score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }
                   
//                     try {
//                         possession = getPossessionScore(player, player["Detailed Position"]);
//                         if (!possession || !possession.score || possession.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Possession score is null/undefined/too small: ${possession?.score}`);
//                             console.log('setting minimal default possession score of 10');
//                             possession = possession || {};
//                             possession.score = 10;
//                             possession.p90s = possession.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Possession score: ${possession?.score}`);
//                             total += parseFloat(possession.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting possession score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }

//                     try {
//                         attacking = getAttackingScore(player, player["Detailed Position"]);
//                         if (!attacking || !attacking.score || attacking.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Attacking score is null/undefined/too small: ${attacking?.score}`);
//                             console.log('setting minimal default attacking score of 10');
//                             attacking = attacking || {};
//                             attacking.score = 10;
//                             attacking.p90s = attacking.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Attacking score: ${attacking?.score}`);
//                             total += parseFloat(attacking.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting attacking score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }

//                     try {
//                         finishing = getFinishingScore(player, player["Detailed Position"]);
//                         if (!finishing || !finishing.score || finishing.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Finishing score is null/undefined/too small: ${finishing?.score}`);
//                             console.log('setting minimal default finishing score of 10');
//                             finishing = finishing || {};
//                             finishing.score = 10;
//                             finishing.p90s = finishing.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Finishing score: ${finishing?.score}`);
//                             total += parseFloat(finishing.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting finishing score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }
//                     const p90s = {
//                         PlayerName: playerData.player_name,
//                         PlayerTeam: player["Player Team"],
//                         MinutesPlayed: player["Minutes Played"],
//                         Position: playerData.position,
//                         DetailedPosition: playerData.detailed_position,
//                         ...defense.p90s,
//                         ...passing.p90s,
//                         ...possession.p90s,
//                         ...attacking.p90s,
//                         ...finishing.p90s,
//                     }

//                     console.log(`[getPlayersThenScore] ${player["Player Name"]} - Inserting per90s data to ${ninetyTable}`);
             
//                     if (defense?.p90s?.TacklesPer90) playerData.tackles_per90 = defense.p90s.TacklesPer90;
//                     if (defense?.p90s?.InterceptionsPer90) playerData.ints_per90 = defense.p90s.InterceptionsPer90;
//                     if (defense?.p90s?.FoulsPer90) playerData.fouls_per90 = defense.p90s.FoulsPer90;
//                     if (passing?.p90s?.KeyPassesPer90) playerData.key_passes_per90 = passing.p90s.KeyPassesPer90;
//                     if (passing?.p90s?.AccurateCrossesPer90) playerData.accurate_crosses_per90 = passing.p90s.AccurateCrossesPer90;
//                     if (finishing?.p90s?.GoalsPer90) playerData.goals_per90 = finishing.p90s.GoalsPer90;
//                     if (attacking?.p90s?.GoalsPer90) playerData.goals_per90 = attacking.p90s.GoalsPer90;
//                     if (attacking?.p90s?.AssistsPer90) playerData.assists_per90 = attacking.p90s.AssistsPer90;
//                     if (attacking?.p90s?.SuccessfulDribblesPer90) playerData.successful_dribbles_per90 = attacking.p90s.SuccessfulDribblesPer90;


//                     await insertPer90s(ninetyTable, player.id, p90s)

//                     if (isMidfielder) {
//                         console.log(`[getPlayersThenScore] ${player["Player Name"]} - Applying midfielder multiplier (1.05)`);
//                         total *= 1.05;
//                     } else if (isCB) {
//                         console.log(`[getPlayersThenScore] ${player["Player Name"]} - Applying CB multiplier (1.7)`);
//                         total *= 1.7;
//                     } else if (isFullback) {
//                         console.log(`[getPlayersThenScore] ${player["Player Name"]} - Applying fullback multiplier (0.95)`);
//                         total *= 0.95;
//                     }

//                     total = (total / 3.2).toFixed(2);
//                     console.log(`[getPlayersThenScore] ${player["Player Name"]} - Final total score: ${total}`);
                    
//                     playerData.defensive_score = parseFloat(defense.score)
//                     playerData.passing_score = parseFloat(passing.score)
//                     playerData.possession_score = parseFloat(possession.score)
//                     playerData.attacking_score = parseFloat(attacking.score)
//                     playerData.finishing_score = parseFloat(finishing.score)
    
//                 } else {
//                     console.log(`[getPlayersThenScore] Processing goalkeeper: ${player["Player Name"]}`);
                    
//                     try {  
//                         keeping = getKeeperScore(player, player["Detailed Position"]);
//                         if (!keeping || !keeping.score || keeping.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Keeping score is null/undefined/too small: ${keeping?.score}`);
//                             console.log('setting minimal default keeping score of 10');
//                             keeping = keeping || {};
//                             keeping.score = 10;
//                             keeping.p90s = keeping.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Keeping score: ${keeping?.score}`);
//                             total += parseFloat(keeping.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting keeping score for ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }

//                     try {
//                         passing = getPassingScore(player, player["Detailed Position"]);
//                         if (!passing || !passing.score || passing.score < 10) {
//                             console.error(`[getPlayersThenScore] ${player["Player Name"]} - Passing score (GK) is null/undefined/too small: ${passing?.score}`);
//                             console.log('setting minimal default passing score of 10');
//                             passing = passing || {};
//                             passing.score = 10;
//                             passing.p90s = passing.p90s || {};
//                             total += 10;
//                         } else {
//                             console.log(`[getPlayersThenScore] ${player["Player Name"]} - Passing score: ${passing?.score}`);
//                             total += parseFloat(passing.score);
//                         }
//                     } catch(err) {
//                         console.error(`[getPlayersThenScore] ERROR getting passing score for goalkeeper ${player["Player Name"]}:`, err);
//                         skippedCount++;
//                         skippedPlayers.push(player["Player Name"]);
//                         continue;
//                     }

//                     total = (total / 1.9).toFixed(2);
//                     console.log(`[getPlayersThenScore] ${player["Player Name"]} - Final goalkeeper total: ${total}`);

//                     playerData.keeper_score = parseFloat(keeping.score)
//                     playerData.passing_score = parseFloat(passing.score)

//                     const p90s = {
//                         PlayerName: playerData.player_name,
//                         PlayerTeam: player["Player Team"],
//                         MinutesPlayed: player["Minutes Played"],
//                         Position: playerData.position,
//                         DetailedPosition: playerData.detailed_position,
//                         ...keeping.p90s,
//                         ...passing.p90s,
//                     }

//                     console.log(`[getPlayersThenScore] ${player["Player Name"]} - Inserting goalkeeper per90s data`);
//                     await insertPer90s(ninetyTable, player.id, p90s)
//                 }
                
//                 playerData.total_score = total;
//                 playerData.transfer_value = (total * 20).toFixed(2);
//                 playerData.player_age = player.Age;
//                 playerData.player_team = player["Player Team"];
//                 playerData.nationality = player.Nation;

//                 console.log(`[getPlayersThenScore] ${player["Player Name"]} - Upserting to ${miniTable} with total_score: ${playerData.total_score}`);
//                 console.log(`[getPlayersThenScore] ${player["Player Name"]} - Full playerData:`, JSON.stringify(playerData));

//                 const { error: uploadError } = await supabase
//                     .from(miniTable)
//                     .upsert([playerData]);

//                 if (uploadError) {
//                     console.error(`[getPlayersThenScore] ERROR uploading scores for player ${player["Player Name"]} (ID: ${player.id}) to ${miniTable}:`, uploadError);
//                     console.error(`[getPlayersThenScore] Upload error details:`, JSON.stringify(uploadError));
//                     console.error(`[getPlayersThenScore] Failed playerData:`, JSON.stringify(playerData));
//                     skippedCount++;
//                     skippedPlayers.push(player["Player Name"]);
//                 } else {
//                     console.log(`[getPlayersThenScore] Successfully uploaded scores for player ${player["Player Name"]} (ID: ${player.id}) to ${miniTable}`);
//                     processedCount++;
//                 }
                
//                 } catch(playerErr) {
//                     console.error(`[getPlayersThenScore] CRITICAL ERROR processing player ${player["Player Name"]} (ID: ${player.id}):`, playerErr);
//                     console.error(`[getPlayersThenScore] Player data that caused error:`, JSON.stringify(player));
//                     skippedCount++;
//                     skippedPlayers.push(player["Player Name"]);
//                 }
//             }

//             console.log(`[getPlayersThenScore] FINAL SUMMARY:`);
//             console.log(`[getPlayersThenScore] Total players in initial data: ${players.length}`);
//             console.log(`[getPlayersThenScore] Successfully processed: ${processedCount}`);
//             console.log(`[getPlayersThenScore] Skipped/Failed: ${skippedCount}`);
//             if (skippedPlayers.length > 0) {
//                 console.log(`[getPlayersThenScore] Skipped players:`, skippedPlayers);
//             }

//             console.log(`[getPlayersThenScore] All players processed and scores uploaded.`);
//         } catch (err) {
//             console.error(`[getPlayersThenScore] CRITICAL ERROR in main function:`, err);
//             console.error(`[getPlayersThenScore] Error stack:`, err.stack);
//         }
//     } else {
//         console.error(`[getPlayersThenScore] Weights not fetched - aborting`);
//     }
// }


    async function getCoachesToDB(seasonID, leaguePrefix){
        try {
            const res = await axios.get(`/api/teams/seasons/${seasonID}`, {
                params: {
                    include: 'players.player;coaches'
                }
            });
            const lads = res.data.data;
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
                        if(manager && manager !== undefined){
                            console.log(manager)
                            manager.age = calculateAge(manager.date_of_birth)
                            manager.league_id = seasonID
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
                                .from(`${leaguePrefix}_managers`)
                                .upsert(manager)

                            if (error){
                                console.error('supa error: ', error)
                            }
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

async function updateMiniTableFromStats(leagueString, seasonString) {
    const statsTable = `${leagueString}_stats_${seasonString}`;
    const miniTable = `${leagueString}_mini_${seasonString}`;
    
    console.log(`[updateMiniTableFromStats] Reading from ${statsTable} and updating ${miniTable}`);
    
    try {
        // Read all players from the stats table
        const { data: statsData, error: readError } = await supabase
            .from(statsTable)
            .select('id, Age, "Player Team", Nation');
        
        if (readError) {
            console.error(`[updateMiniTableFromStats] Error reading from ${statsTable}:`, readError);
            return;
        }
        
        console.log(`[updateMiniTableFromStats] Found ${statsData.length} players in stats table`);
        
        // Transform the data for the mini table
        const miniData = statsData.map(player => ({
            id: player.id,
            player_age: player.Age,
            player_team: player['Player Team'],
            nationality: player.Nation
        }));
        
        // Batch upsert to mini table
        const { error: insertError } = await supabase
            .from(miniTable)
            .upsert(miniData, { onConflict: 'id' });
        
        if (insertError) {
            console.error(`[updateMiniTableFromStats] Error inserting into ${miniTable}:`, insertError);
        } else {
            console.log(`[updateMiniTableFromStats] Successfully updated ${miniData.length} players in ${miniTable}`);
        }
        
    } catch (err) {
        console.error(`[updateMiniTableFromStats] Exception:`, err);
    }
}


async function insertPer90s(ninetyTable, id, p90s){
    console.log(`[insertPer90s] Starting insert for player ID ${id} to table ${ninetyTable}`);
    console.log(`[insertPer90s] P90s data keys:`, Object.keys(p90s));
    
    try {
        const { data, error } = await supabase
            .from(ninetyTable)
            .upsert({
                id: id,
                ...p90s,
            }, { onConflict: 'id'})
        
        if(error){
            console.error(`[insertPer90s] ERROR for player ID ${id}:`, error);
            console.error(`[insertPer90s] Error details:`, JSON.stringify(error));
            console.error(`[insertPer90s] Failed p90s data:`, JSON.stringify(p90s));
            if (error.message && error.message.includes('onConflict')) {
                console.error(`[insertPer90s] OnConflict triggered for ID ${id} - this may indicate duplicate processing`);
            }
        } else {
            console.log(`[insertPer90s] Successfully uploaded player ID ${id} to ${ninetyTable}`);
            if (data) {
                console.log(`[insertPer90s] Returned data for ID ${id}:`, JSON.stringify(data));
            }
        }
    } catch(err) {
        console.error(`[insertPer90s] EXCEPTION for player ID ${id}:`, err);
        console.error(`[insertPer90s] Exception stack:`, err.stack);
    }
}

/////////////////////////
// API to Main Stat DB //

   async function getLeaguePlayersAndUpload(seasonId, leagueString, seasonString){
    console.log(`[getLeaguePlayersAndUpload] Starting for seasonId: ${seasonId}, league: ${leagueString}, season: ${seasonString}`);
    
    let lads = [];
    let res = null;
    
    try {
        console.log(`[getLeaguePlayersAndUpload] Fetching teams from API for season ${seasonId}`);
        res = await axios.get(`/api/teams/seasons/${seasonId}`, {
            params: {
                include: 'players.player;coaches'
            }
        })
        console.log(`[getLeaguePlayersAndUpload] API response received, status: ${res.status}`);
    } catch(err){
        console.error(`[getLeaguePlayersAndUpload] ERROR fetching teams from API:`, err);
        console.error(`[getLeaguePlayersAndUpload] Error details:`, err.response?.data || err.message);
        return;
    }
    
    if(res.data){
        lads = res.data.data;
        console.log(`[getLeaguePlayersAndUpload] Found ${lads.length} teams`);
        
        // Process each player sequentially
        for (const team of lads) {
            console.log(`[getLeaguePlayersAndUpload] Processing team: ${team.name}`);
            
            if (team.players && team.players.length > 0) {
                console.log(`[getLeaguePlayersAndUpload] Team ${team.name} has ${team.players.length} players`);
                
                for (const player of team.players) {
                    if (player.player.date_of_birth !== null) {
                        console.log(`[getLeaguePlayersAndUpload] Fetching stats for player ${player.player.id} (${player.player.name || 'unnamed'}) from team ${team.name}`);
                        
                        try {
                            await getPlayerStatsAndUpload(player.player.id, team.name, seasonId, leagueString, seasonString);
                            console.log(`[getLeaguePlayersAndUpload] Successfully processed player ${player.player.id}`);
                        } catch(err) {
                            console.error(`[getLeaguePlayersAndUpload] ERROR processing player ${player.player.id}:`, err);
                            console.error(`[getLeaguePlayersAndUpload] Continuing with next player...`);
                        }
                    } else {
                        console.log(`[getLeaguePlayersAndUpload] Skipping player ${player.player.id} - no date of birth`);
                    }
                }
            } else {
                console.log(`[getLeaguePlayersAndUpload] Team ${team.name} has no players`);
            }
        }
        
        // console.log(`[getLeaguePlayersAndUpload] All players processed, starting score calculation`);
        // await getPlayersThenScore(leagueString, seasonString)
        
        // console.log(`[getLeaguePlayersAndUpload] Score calculation complete, starting stat rankings`);
        // await statRankings(leagueString, seasonString)
        
        console.log(`[getLeaguePlayersAndUpload] All processing complete for league ${leagueString}, season ${seasonString}`);
    } else {
        console.error(`[getLeaguePlayersAndUpload] No data received from API`);
    }
}

    // async function getPremPlayersAndUpload() {
    //     console.log('Fetching Premier League players...');
    //     let lads = [];
    //     try {
    //         // Fetch all teams and players for the season
    //         const premRes = await axios.get('/api/teams/seasons/23614', {
    //             params: {
    //                 include: 'players.player;coaches'
    //             }
    //         });
    //         lads = premRes.data.data;
    //         console.log("Teams and Players:", lads);

    //         // Process each player sequentially
    //         for (const team of lads) {
    //             if (team.players && team.players.length > 0) {
    //                 for (const player of team.players) {
    //                     if (player.player.date_of_birth !== null) {
    //                         console.log(`Fetching stats for player ${player.player.id}...`);
    //                         await getPlayerStatsAndUpload(player.player.id, team.name, 23614); // Process each player one at a time
    //                     }
    //                 }
    //             }
    //         }
    //         console.log('Operation Success!')
    //         await getPlayersThenScore('prem_mini_2425')
    //         await statRankings()
    //     } catch (err) {
    //         console.error("Error fetching Premier League players:", err);
    //     }
    // }

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




    async function getPlayerStatsAndUpload(id, teamName, seasonId, leagueString, seasonString) {
		let seasonStats = null;
        let table = `${leagueString}_stats_${seasonString}`
        let miniTable = `${leagueString}_mini_${seasonString}`
      
        try {
            // Fetch player data
            const response = await axios.get(`/api/players/${id}`, { 
                params: {
                    include: 'statistics.details.type;position;detailedPosition',
                    filter: `playerStatisticSeasons:${seasonId}`
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

                    const extraDataMini = {
                        player_age : statsToInsert["Age"],
                        player_team: statsToInsert["Player Team"],
                        nationality: statsToInsert["Nation"]
                    }

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
                        .from(table) 
                        .upsert([statsToInsert]);

                    if (error) {
                        console.error(`Error inserting stats for player ${playerData.display_name}:`, error);
                        console.error(`ID ${playerData.id}`, statsToInsert);
                    } else {
                        console.log(`Successfully inserted stats for player ${playerData.display_name}`);
                    }

                    //Insert extra mini data which doesn't go into per90 table

                    const { miniError } = await supabase  
                        .from(miniTable)
                        .upsert([extraDataMini])

                    if (miniError) {
                        console.error(`Error inserting extra mini data for player ${playerData.display_name}:`, miniError);
                        console.error(`ID ${playerData.id}`, extraDataMini);
                    } else {
                        console.log(`Successfully inserted extra mini data for player ${playerData.display_name}`);
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

    keepingScore = (keepingScore / 14).toFixed(2)
    keepingScore = capScore(keepingScore)
    console.log('keeping score', keepingScore)
    return {
        score: keepingScore,
        p90s: per90Stats
    }
}
function getFinishingScore(row, detailedPosition) {
    const weights = finishingWeightMap[detailedPosition];
    if(!weights){
        console.error('Weight map not found', detailedPosition)
    }
    const stats = {
        BigChancesMissed: row['Big Chances Missed'] || 0,
        Goals: row['Goals'] || 0,
        HitWoodwork: row['Hit Woodwork'] || 0,
        BlockedShots: row['Blocked Shots'] || 0,
        ShotsOffTarget: row['Shots Off Target'] || 0,
        ShotsOnTarget: row['Shots On Target'] || 0,
        Offsides: row['Offsides'] || 0
    };
    
    const minutesPlayed = row['Minutes Played'] || 0;

    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
    }

    let finishingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        finishingScore += (per90Stats[key] || 0) * weight;
    }

    // Apply consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    finishingScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        finishingScore = finishingScore * minutesPercentage;
    }

    finishingScore = (finishingScore * 2).toFixed(2);
    finishingScore = capScore(finishingScore)
    return {
        score: finishingScore,
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
async function statRankings(leagueString, seasonString) {
    console.log(`[statRankings] Starting rankings for league: ${leagueString}, season: ${seasonString}`);
    
    const ninetyTable = `${leagueString}_stats_${seasonString}_per90`
    const rankTable = `${leagueString}_stats_${seasonString}_rankings`
    
    console.log(`[statRankings] Tables - ninety: ${ninetyTable}, rank: ${rankTable}`);
    
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
    
    console.log(`[statRankings] Fetching data from ${ninetyTable}`);
    
    const { data, error } = await supabase
        .from(ninetyTable)
        .select('*');
    
    if (error) {
        console.error(`[statRankings] ERROR fetching from ${ninetyTable}:`, error);
        console.error(`[statRankings] Error details:`, JSON.stringify(error));
        return;
    }
    
    if (!data || data.length === 0) {
        console.warn(`[statRankings] No data found in ${ninetyTable}`);
        return;
    }
    
    console.log(`[statRankings] Fetched ${data.length} players from ${ninetyTable}`);
    
    // Only get rankings for players with significant minutes (half of the maximum or greater)
    const maxMinutes = Math.max(...data.map(player => player.MinutesPlayed));
    console.log(`[statRankings] Max minutes played: ${maxMinutes}`);
    
    const minutesThreshold = maxMinutes / 3;
    console.log(`[statRankings] Minutes threshold (max/3): ${minutesThreshold}`);
    
    const filteredPlayers = data.filter(player => player.MinutesPlayed >= minutesThreshold);
    console.log(`[statRankings] ${filteredPlayers.length} players meet minutes threshold`);
    
    // Separate players into keepers and non-keepers
    const keepers = filteredPlayers.filter(player => player.DetailedPosition === 'Goalkeeper');
    const nonKeepers = filteredPlayers.filter(player => player.DetailedPosition !== 'Goalkeeper');
    
    console.log(`[statRankings] Found ${keepers.length} keepers and ${nonKeepers.length} non-keepers`);
    
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
    
    console.log(`[statRankings] Initialized ranked data for ${rankedData.length} players`);
    
    // Helper function to rank players with tie handling
    const rankPlayers = (players, stat, isInverted) => {
        console.log(`[statRankings] Ranking ${players.length} players for stat: ${stat} (inverted: ${isInverted})`);
        
        const sortedPlayers = [...players].sort((a, b) => isInverted ? a[stat] - b[stat] : b[stat] - a[stat]);
        let currentRank = 1;
        let previousValue = null;
        let firstRankSet = false
        
        sortedPlayers.forEach((player, index) => {
            const playerInRankedData = rankedData.find(p => p.id === player.id);
            
            if (!playerInRankedData) {
                console.error(`[statRankings] Could not find player ID ${player.id} in rankedData`);
                return;
            }
            
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
        
        console.log(`[statRankings] Completed ranking for stat: ${stat}`);
    };
    
    // Rank non-keepers using statsToRank
    console.log(`[statRankings] Starting to rank non-keepers for ${statsToRank.length} stats`);
    statsToRank.forEach(stat => {
        const isInverted = invertedStats.includes(stat);
        rankPlayers(nonKeepers, stat, isInverted);
    });
    
    // Rank keepers using keeperStatsToRank
    console.log(`[statRankings] Starting to rank keepers for ${keeperStatsToRank.length} stats`);
    keeperStatsToRank.forEach(stat => {
        const isInverted = invertedStats.includes(stat);
        rankPlayers(keepers, stat, isInverted);
    });
    
    console.log(`[statRankings] All rankings complete, upserting ${rankedData.length} records to ${rankTable}`);
    console.log(`[statRankings] Sample ranked data (first player):`, JSON.stringify(rankedData[0]));
    
    try {
        const { rankings, err } = await supabase
            .from(rankTable)
            .upsert(rankedData, { onConflict: 'id' })
        
        if (err) {
            console.error(`[statRankings] ERROR upserting rankings to ${rankTable}:`, err);
            console.error(`[statRankings] Error details:`, JSON.stringify(err));
            console.error(`[statRankings] Failed data sample (first 3 records):`, JSON.stringify(rankedData.slice(0, 3)));
        } else {
            console.log(`[statRankings] Successfully uploaded ${rankedData.length} rankings to ${rankTable}`);
            if (rankings) {
                console.log(`[statRankings] Returned data length:`, rankings.length);
            }
        }
    } catch(err) {
        console.error(`[statRankings] EXCEPTION during upsert:`, err);
        console.error(`[statRankings] Exception stack:`, err.stack);
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
    console.log('Country → Image map:', nameImageMap);

    return nameImageMap;

  } catch (err) {
    console.error('Error fetching nations', err);
    // return an empty map on error
    return {};
  }
}

    let leagueIdConfig = {
        23614: ['prem_stats_2425','prem_stats_2425_per90','prem_stats_2425_rankings'],
        23744: ['bundes_stats_2425','bundes_stats_2425_per90'],
        23643: ['ligue1_stats_2425','ligue1_stats_2425_per90'],
        23621: ['laliga_stats_2425','laliga_stats_2425_per90'],
        23746: ['seriea_stats_2425','seriea_stats_2425_per90']


}
// 462
async function allLeaguesLastSeason(){
    await getLeaguePlayersAndUpload(23744, 'bundes','2425')
    await getLeaguePlayersAndUpload(23621, 'laliga','2425')
    await getLeaguePlayersAndUpload(23643, 'ligue1','2425')
    await getLeaguePlayersAndUpload(23614, 'prem','2425')
    await getLeaguePlayersAndUpload(23746, 'seriea','2425')
}

async function allLeaguesThisSeason(){
    await getLeaguePlayersAndUpload(25646, 'bundes','2526')
    await getLeaguePlayersAndUpload(25659, 'laliga','2526')
    await getLeaguePlayersAndUpload(25651, 'ligue1','2526')
    await getLeaguePlayersAndUpload(25583, 'prem','2526')
    await getLeaguePlayersAndUpload(25533, 'seriea','2526')
}

async function updateAllMinis(seasonString){
    await updateMiniTableFromStats('bundes', seasonString)
    await updateMiniTableFromStats('laliga', seasonString)
    await updateMiniTableFromStats('ligue1', seasonString)
    await updateMiniTableFromStats('prem', seasonString)
    await updateMiniTableFromStats('seriea', seasonString)
}

async function allPer90s(){
    await calculatePer90s('bundes', '2526')
    await calculatePer90s('laliga', '2526')
    await calculatePer90s('ligue1', '2526')
    await calculatePer90s('prem', '2526')
    await calculatePer90s('seriea', '2526')
}

async function allManagers(){
    await getCoachesToDB(23614, 'prem')
    await getCoachesToDB(23621, 'laliga')
    await getCoachesToDB(23744, 'bundes')
    await getCoachesToDB(23643, 'ligue1')
    await getCoachesToDB(23746, 'seriea')
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
        <button><a href={'/dev/update_players'}>Update Players</a></button>
        <button><a href={'/dev/weekly'}>Weekly Matches</a></button>
        <button onclick={allLeaguesLastSeason()}>All Leagues Last Season</button>
        <button onclick={allLeaguesThisSeason()}>All Leagues This Season</button>
        <button onclick={updateAllMinis('2526')}>Update All Minis</button>
        <button onclick={allPer90s()}>All Per 90s</button>
        <button onclick={populatePlayerSeasonLog('2425', '2526')}>Run Player Season Log</button>
        <button onclick={getLeaguePlayersAndUpload(23614, 'prem','2425')}>Premier League</button>
        <button onclick={getLeaguePlayersAndUpload(23744, 'bundes','2425')}>Bundesliga</button>
        <button onclick={getLeaguePlayersAndUpload(23643, 'ligue1','2425')}>Ligue 1</button>
        <button onclick={getLeaguePlayersAndUpload(23621, 'laliga','2425')}>La Liga</button>
        <button onclick={getLeaguePlayersAndUpload(23746, 'seriea','2425')}>Serie A</button>
        <button onclick={getSinglePlayerApi(1743)}>Player by ID - API</button>
        <button onclick={fetchAllWeights}>Weights</button>
        <button onclick={testWeightMap}>Test Weight to Defense</button>
        <button onclick={statRankings}>Stat Rankings</button>
        <button onclick={allManagers}>Managers to DB</button>
        <button onclick={getNations}>Nations</button>
        <!-- <button onclick={getPlayerImages('prem_mini_2425_testing')}>Player Images Test</button>
        <button onclick={getPlayerImages('prem_mini_2425')}>Player Images to Mini</button> -->
    </div>  
{/if}
{#if userStore.user}
    <h2>Signed in as {userStore.user ? userStore.user.signInDetails.loginId : null}</h2>
    <button onclick={signUserOut}>Logout</button>
{/if}
<button><a href="/">Home</a></button>
{#if !draft.complete}
<button><a href="/draft">To Draft</a></button>
{/if}
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
