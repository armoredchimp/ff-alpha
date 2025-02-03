<script>
	import axios, { all } from 'axios';
	import '../app.css';
	import DraftPlayer from '$lib/DraftPlayer.svelte';
	let { children } = $props();

	let fixtures = $state([]);
	let leagues = $state([]);
	let players = $state([])
	let scots = $state([])
	let allPlayers = $state([])
	
	async function getFixturesTest(){
		try {
			const fixturesRes = await axios.get('/api/fixtures',{
				params: {
					include: 'statistics;events',
				}
			})
			// testFixtures = fixturesRes.data
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
						const nation = await getNation(player.player.country_id);	
						allPlayers.push({
							...player.player,
							nationality: nation.name,
							nation_image: nation.image_path,
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
<button onclick={currentScotlandTeams}>Scots Season</button>

<!-- <h1>Fixtures</h1>
{#if fixtures.length > 0}
	{#each fixtures as fixture}
		<div class="fixture">
			<h3>{fixture.name}</h3>
			<h4>{fixture.starting_at}</h4>
		</div>
	{/each}	
{:else}
		<p>No fixtures found</p>
{/if}		
<h2>AND</h2>
<h1>Leagues</h1>
{#if leagues.length > 0}
	{#each leagues as league}
		<div class="fixture">
			<h3>{league.name}</h3>
			<h4>{league.id}</h4>
		</div>
	{/each}	
{:else}
		<p>No leagues found</p>
{/if}
<h2>AND</h2>
<h1>Players</h1>
{#if players.length > 0}
	{#each players as player}
		<div class="fixture">
			<h3>{player.name}</h3>
			<h4>{player.id}</h4>
		</div>
	{/each}	
{:else}
		<p>No players found</p>
{/if}
<h2>AND</h2>
<h1>Scots</h1>
{#if scots.length > 0}
	{#each scots as scot}
		<div class="fixture">
			<h3>{scot.name}</h3>
		</div>
	{/each}	
{:else}
		<p>No players found</p>
{/if} -->

<div class="page-container">
	<div class="players-section">
		<h3>Scottish Players: {allPlayers.length + 1}</h3>
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