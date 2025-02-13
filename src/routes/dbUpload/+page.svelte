<script>
    import axios from "axios";
    import { allPlayers } from "$lib/stores/stores.svelte";
    import { createClient } from "@supabase/supabase-js";

    const supabaseURL = import.meta.env.VITE_DB_URL
    const supabaseKey = import.meta.env.VITE_DB_API_KEY
    const supabase = createClient(supabaseURL, supabaseKey)


    async function getPlayerStatsAndUpload(id) {
    try {
        console.log()
        const lad = await axios.get(`/api/players/${id}`, { // Your API call
            params: {
                include: 'statistics.details.type;position;detailedPosition',
                filter: 'playerStatisticSeasons:23614'
            }
        });

        const playerData = lad.data.data;
        console.log(playerData)
        if (playerData && playerData.statistics && playerData.statistics.length > 0) {
            const seasonStats = playerData.statistics[0];
            if (seasonStats.details) {
                const statsToInsert = {
                    id: playerData.id,  
                    name: playerData.name,      
                   
                };
            seasonStats.details.forEach(stat => {
                    const { type, value } = stat;
                    const statName = type.name;
                    let statValue;        
                    statsToInsert[statName] = statValue;  
                });

            const { error } = await supabase.from('Prem Stats 24/25').insert([statsToInsert])
            
            if (error) {
                console.error(err)
                console.error(`ID ${playerData.id} STAT ${statsToInsert}`)
            }else {
                console.log(`Success for player ${playerData.name}`)
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
        console.log('hi')
        let lads = []
        try {
            const premRes = await axios.get('/api/teams/seasons/23614',{
                params: {
                    include: 'players.player'
                }
            });
            lads = premRes.data.data;
            console.log(lads)
            for (const team of lads) {
                if (team.players && team.players.length > 0) {
                    for (const player of team.players) {
                        if (player.player.date_of_birth !== null) {
                            allPlayers.push({
                                ...player.player,
                            });
                            console.log(`yes ${player.player.id}`)
                            getPlayerStatsAndUpload(player.player.id)
                        }	
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }
</script>

<button onclick={getPremPlayersAndUpload}>Let's Go</button>