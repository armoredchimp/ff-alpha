<script>
    import axios from "axios";
    import { allPlayers } from "$lib/stores/stores.svelte";
    import { createClient } from "@supabase/supabase-js";
    import { getKeeperScore, getAttackingScore, getDefensiveScore, getPassingScore, getPossessionScore } from "$lib/utils/playerCalcs";

    const supabaseURL = import.meta.env.VITE_DB_URL
    const supabaseKey = import.meta.env.VITE_DB_API_KEY
    const supabase = createClient(supabaseURL, supabaseKey)
   

    const extraIds = [37317015,27067062,26803,37543248,34053,154421,28912747,25217662]

    async function addExtraPlayers(ids){
        for(let i = 0; i < ids.length; i++){
            getPlayerStatsAndUpload(ids[i])
        }
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

async function getPlayersThenScore(){
    let { data: row, error } = await supabase
        .from('prem_stats_2425')
        .select('*')

    
}

async function getPlayerStatsAndUpload(id) {
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

        await delay(2500); // Add a delay after each request

        if (playerData && playerData.statistics && playerData.statistics.length > 0) {
            const seasonStats = playerData.statistics[0];

            if (seasonStats.details.length > 1) {
                // Initialize the stats object with common player data
                const statsToInsert = {
                    id: playerData.id,
                    Position: playerData.position.name,
                    "Detailed Position": playerData.detailedposition.name,
                    "Player Name": playerData.display_name,
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
                        await getPlayerStatsAndUpload(player.player.id); // Process each player one at a time
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error fetching Premier League players:", err);
    }
}


</script>


<button onclick={getPremPlayersAndUpload}>Let's Go</button>
<button onclick={addExtraPlayers(extraIds)}>Extra Players</button>
<button></button>