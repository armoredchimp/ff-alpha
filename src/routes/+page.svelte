<script>
	import axios from "axios";
	import '../app.css';
	import { allPlayers } from "$lib/stores/stores.svelte";
	import DraftPlayer from "$lib/DraftPlayer.svelte";
    import PlayerTeam from "$lib/PlayerTeam.svelte";
	import { countryMap, getCountry } from '$lib/data/countries';

	let { children } = $props();

	async function getScotlandPlayers() {
        let scots = []
        try {
            const scotsRes = await axios.get('/api/teams/seasons/23690', {
                params: {
                    include: 'players.player',
                }
            });
            scots = scotsRes.data.data;

            for (const team of scots) {
                if (team.players && team.players.length > 0) {
                    for (const player of team.players) {
                        if (player.player.date_of_birth !== null) {
                            const nation = await getCountry(player.player.country_id);	
                            allPlayers.push({
                                ...player.player,
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

<button onclick={getScotlandPlayers}>Get Players</button>
<div class="page-container">
	<div class="players-section">
		<h3>Scottish Players: {allPlayers.length + 1}</h3>
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