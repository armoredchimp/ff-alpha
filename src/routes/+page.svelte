<script>
	import axios from "axios";
	import '../app.css';
	import { allPlayers } from "$lib/stores/stores.svelte";
	import DraftPlayer from "$lib/DraftPlayer.svelte";
    import PlayerTeam from "$lib/PlayerTeam.svelte";
	import { countryMap, getCountry } from '$lib/data/countries';
    import { supabase } from "$lib/supabase/supaClient";
	
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
</script>

<!-- <button onclick={getTeamsList}>Get Teams</button> -->
<h4><a href='/dbUpload'>To Upload Page</a></h4>
<button onclick={getPlayerById(54191)}>getPlayerById</button>
<button onclick={getPremPlayers}>Get Players</button>
<div class="page-container">
	<div class="players-section">
		<h3>Prem Players: {allPlayers.length}</h3>
		<div class="player-list">
			{#each allPlayers as player}
				<DraftPlayer player={player} />
			{/each}
		</div>
	</div>
    <div class="team-section">
        <PlayerTeam />
    </div>
    <div class="placeholder-section"></div>
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

    .team-section {
        flex: 0 0 30%; 
    }

    .placeholder-section {
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