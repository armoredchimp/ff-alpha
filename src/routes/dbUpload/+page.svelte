<script>
    import axios from "axios";
    import { allPlayers } from "$lib/stores/stores.svelte";
    import { createClient } from "@supabase/supabase-js";
    import { supabase } from "$lib/supabase/supaClient";
    import { countryMap, getCountry } from '$lib/data/countries';
    import { getKeeperScore, getAttackingScore, getDefensiveScore, getPassingScore, getPossessionScore } from "$lib/utils/playerCalcs";

   
   

    const extraIds = [37317015,27067062,26803,37543248,34053,154421,28912747,25217662]

    let defenseWeightMap = $state({})
    let passingWeightMap = $state({})
    let possessionWeightMap = $state({})
    let attackingWeightMap = $state({})
    let keepingWeightMap = $state({})

    function capScore(score) {
        return Math.min(score, 5000);
    }

    async function addExtraPlayers(ids){
        for(let i = 0; i < ids.length; i++){
            getPlayerStatsAndUpload(ids[i])
        }
    }

    async function getWeightsFromTable(tableName, weightMap){
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.error(`Error fetching weights from ${tableName}`)
            return null;
        }
        
        data.forEach(row => {
            weightMap[row.Position] = row;
        });

        console.log(`Weight Map returned: `, weightMap)
    }

    async function fetchAllWeights(){
        getWeightsFromTable('getDefensiveScore', defenseWeightMap)
        getWeightsFromTable('getKeeperScore', keepingWeightMap)
    }

    async function testSupabaseConnection() {
    try {
        // Define a simple payload
        const testPayload = {
            id: 3,
            "Player Name": "Test Player",
            Goals: 1,
            Assists: 2,
            Rating: 7.0
        };

        console.log("Test Payload:", testPayload);

        const { data, error } = await supabase
            .from('prem_stats_2425') 
            .insert([testPayload]);

        if (error) {
            console.error("Test insert failed:", error);
        } else {
            console.log("Test insert succeeded:", data);
        }
    } catch (error) {
        console.error("Error in testSupabaseConnection:", error);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateAge(date_of_birth) {
    const dob = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}



async function getPlayersThenScore() {
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
            let total = 0; // Initialize total score

            const isKeeper = player.Position === 'Goalkeeper';
            const isMidfielder = player.Position === 'Midfielder';
            const isAttacker = player.Position === 'Attacker';
            const isCB = player["Detailed Position"] === 'Centre-Back';
            const isFullback = player["Detailed Position"] === 'Left-Back' || player["Detailed Position"] === 'Right-Back';

            if (!isKeeper) {
                defense = getDefensiveScore(player, player.Position, player["Detailed Position"]);
                defense = capScore(defense); 
                total += parseFloat(defense);

                passing = getPassingScore(player, player.Position, player["Detailed Position"]);
                passing = capScore(passing);
                total += parseFloat(passing);

                possession = getPossessionScore(player, player.Position, player["Detailed Position"]);
                possession = capScore(possession);
                total += parseFloat(possession);

                attacking = getAttackingScore(player, player.Position, player["Detailed Position"]);
                attacking = capScore(attacking);
                total += parseFloat(attacking);

                if (isMidfielder) {
                    total *= 1.2;
                } else if (isAttacker) {
                    total *= 1.3;
                } else if (isCB) {
                    total *= 1.4;
                } else if (isFullback) {
                    total *= 0.95;
                }

                total = (total / 4).toFixed(2);
                console.log('total:  ', total)
            } else {
                keeping = getKeeperScore(player);
                keeping = capScore(keeping);
                total += parseFloat(keeping);

                passing = getPassingScore(player, player.Position, player["Detailed Position"]);
                passing = capScore(passing);
                total += parseFloat(passing);

                total = (total / 2).toFixed(2);
            }
            playerData.total_score = total;
            playerData.transfer_value = (total * 20).toFixed(2);
            playerData.player_age = player.Age;
            playerData.player_team = player["Player Team"];
            playerData.nationality = player.Nation;

            if (!isKeeper) {
                playerData.defensive_score = parseFloat(defense)
                playerData.passing_score = parseFloat(passing)
                playerData.possession_score = parseFloat(possession)
                playerData.attacking_score = parseFloat(attacking)
            } else {
                playerData.keeper_score = parseFloat(keeping)
                playerData.passing_score = parseFloat(passing)

            }

            const { error: uploadError } = await supabase
                .from('prem_mini_2425')
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
}



async function getPlayerStatsAndUpload(id, teamName) {
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
            const seasonStats = playerData.statistics[0];

            if (seasonStats.details.length > 1) {
                // Initialize the stats object with common player data
                const statsToInsert = {
                    id: playerData.id,
                    Position: playerData.position.name,
                    "Detailed Position": playerData.detailedposition.name,
                    "Player Name": playerData.display_name,
                    "Player Team": teamName,
                    Age: calculateAge(playerData.date_of_birth),
                    Nation: getCountry(playerData.nationality_id)
                };

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

async function getPremPlayersAndUpload() {
    console.log('Fetching Premier League players...');
    let lads = [];
    try {
        // Fetch all teams and players for the season
        const premRes = await axios.get('/api/teams/seasons/23614', {
            params: {
                include: 'players.player'
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
        getPlayersThenScore()
    } catch (err) {
        console.error("Error fetching Premier League players:", err);
    }
}


</script>

<button><a href="../">Home</a></button>
<button onclick={getPremPlayersAndUpload}>Let's Go</button>
<button onclick={addExtraPlayers(extraIds)}>Extra Players</button>
<button onclick={getPlayersThenScore}>Upload Scores to Mini</button>
<button onclick={fetchAllWeights}>Weights</button>

<style>
    button {
        margin-right: 2rem;
    }
</style>
