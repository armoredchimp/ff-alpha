<script>
	import axios, { all } from 'axios';
	import '../app.css';
	import DraftPlayer from '$lib/DraftPlayer.svelte';
	import { countryMap, getCountry } from '$lib/data/countries';
	let { children } = $props();
	

	let fixtures = $state([]);
	let leagues = $state([]);
	let players = $state([])
	let scots = $state([])
	let allPlayers = $state([])
	let countries = $state(0)

	async function getFixturesTest(){
		try {
			const fixturesRes = await axios.get('/api/fixtures',{
				params: {
					include: 'statistics;events',
				}
			})
			fixtures = fixturesRes.data.data
			console.log(fixtures)
		}catch(err){
			console.error(err)
		}
	}

	async function getPlayersTest(){
		try {
			const playersRes = await axios.get('/api/players',{
				params: {
					include: 'statistics',
				}
			})
			players = playersRes.data.data
			console.log(players)
		}catch(err){
			console.error(err)
		}
	}

	async function getLeaguesTest(){
		try {
			const leaguesRes = await axios.get('/api/leagues/501',{
				params: {
					include: 'currentSeason',
				}
			})
			// testLeagues = leaguesRes.data
			leagues = leaguesRes.data.data
			console.log(leagues)
		}catch(err){
			console.error(err)
		}
	}

	async function getNation(id) {
		try {
			const nationRes = await axios.get(`/core/countries/${id}`);
			return {
				name: nationRes.data.data.name,
				image_path: nationRes.data.data.image_path
			}
		} catch (err) {
			console.error(`Error fetching nation for country_id ${id}:`, err);
			return {
				name: 'Unknown',
				image_path: ''
			}
		}
}

	async function getAllNations(){
		try {
			for (let i = 1; i < 10; i++){
				const allNations = await axios.get(`/core/countries?page=${i}`)
				for (let i = 0; i < allNations.data.data.length; i++){
					console.log(`ID: ${allNations.data.data[i].id} NAME: ${allNations.data.data[i].name}`)
					countries++
				}	
			}
		}catch(err){
			console.error(err)
		}
	}

	async function currentScotlandTeams() {
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
					if(player.player.date_of_birth !== null){
						const nation = await getCountry(player.player.country_id);	
						allPlayers.push({
							...player.player,
							nationality: nation,
							// nationality: nation.name,
							// nation_image: nation.image_path,
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

{@render children()}

<button onclick={getFixturesTest}>Fixtures</button>
<button onclick={getLeaguesTest}>Leagues</button>
<button onclick={getNation(146)}>Nation</button>
<button onclick={getAllNations}>All Nations</button>
<button onclick={currentScotlandTeams}>Scots Season</button>


<div class="page-container">
	<div class="players-section">
		<h3>Scottish Players: {allPlayers.length + 1}</h3>
		<h3>Countries: {countries}</h3>
		{#each allPlayers as player}
			<DraftPlayer player={player} />
		{/each}
	</div>
</div>

<style>
	button {
		background-color: blue;
		padding: 1rem;
	}
</style>