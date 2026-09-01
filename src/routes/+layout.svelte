<script>
	import axios from "axios";
    import '../app.css';
    import { Amplify } from 'aws-amplify';
    import amplifyConfig from "$lib/client/aws/amplifyConfig";
	import { onMount } from "svelte";
    import { getCurrentUser, signOut } from "aws-amplify/auth";
    import { afterNavigate } from "$app/navigation";
    import { refreshServerToken } from "$lib/client/auth/tokenRefresh";
    import { defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, finishingWeightMap, defenseImpMap, passingImpMap, possessionImpMap, attackingImpMap, keepingImpMap, finishingImpMap } from "$lib/stores/generic.svelte";
	import { draft } from "$lib/stores/draft.svelte";
	import { managers } from "$lib/stores/generic.svelte";
	import { userStore, setUser, getUser, resetUserStore } from "$lib/stores/userStore.svelte";
	import { goto, invalidateAll } from "$app/navigation";
	import LineupCountdown from "$lib/LineupCountdown.svelte";
	
    

    let refreshInterval = null;
    const REFRESH_MS = 30 * 60 * 1000;

	let { children } = $props();
   
    let weightsFetched = $state(false)
    let devBarVisible = $state(false)

    onMount(()=>{
        Amplify.configure(amplifyConfig)
        checkUser()
        fetchAllWeights()
        // getAverages()

        refreshInterval = setInterval(() => {
            if (userStore.user) refreshServerToken();
        }, REFRESH_MS);

        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
	})

    afterNavigate(() => {
        if (userStore.user) refreshServerToken();
    });


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
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
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

    // async function getAverages(){
    //     const { data: outfieldData, outError } = await supabase
    //         .from('outfield_per90_averages')
    //         .select('*') 

    //     if (outError){
    //         console.error('Error retrieving outfield avgs: ', outError)
    //     }
    //     const { data: keeperData, keepError } = await supabase
    //         .from('gk_per90_averages')
    //         .select('*') 

    //     if (keepError){
    //         console.error('Error retrieving keeper avgs: ', keepError)
    //     }
    //     setAvgs(outfieldData, keeperData, outfieldAverages, keeperAverages)
    // }

    // function setAvgs(outD, keepD, outAvgs, keepAvgs){
    //     outAvgs['data'] = outD;
    //     keepAvgs['data'] = keepD;
    //     console.log(outfieldAverages, keeperAverages)
    // }

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

    const WEIGHT_MAPS = {
        getDefensiveScore: [defenseWeightMap, defenseImpMap],
        getKeeperScore: [keepingWeightMap, keepingImpMap],
        getPossessionScore: [possessionWeightMap, possessionImpMap],
        getPassingScore: [passingWeightMap, passingImpMap],
        getAttackingScore: [attackingWeightMap, attackingImpMap],
        getFinishingScore: [finishingWeightMap, finishingImpMap]
    };

    function applyWeights(rows, weightMap, impMap) {
        rows.forEach(row => {
            const weights = Object.keys(row).reduce((acc, key) => {
                if (key !== 'Position') {
                    acc[key] = row[key];
                }
                return acc;
            }, {});

            weightMap[row.Position] = weights;

            const importances = {};
            Object.keys(weights).forEach(stat => {
                importances[stat] = calculateImportance(weights[stat]);
            });
            impMap[row.Position] = importances;
        });
    }

    async function fetchAllWeights() {
        try {
            const res = await fetch('/api/supabase/weights');
            if (!res.ok) {
                console.error('Failed to load weights:', res.status);
                return;
            }

            const { weights } = await res.json();

            for (const [table, [weightMap, impMap]] of Object.entries(WEIGHT_MAPS)) {
                applyWeights(weights[table] ?? [], weightMap, impMap);
            }

            weightsFetched = true;
        } catch (err) {
            console.error('Weights fetch failed:', err);
        }
    }


    // async function getCoachesToDB(seasonID, leaguePrefix){
    //     try {
    //         const res = await axios.get(`/api/teams/seasons/${seasonID}`, {
    //             params: {
    //                 include: 'players.player;coaches'
    //             }
    //         });
    //         const lads = res.data.data;
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
    //                     let manager = coachRes.data.data
    //                     if(manager && manager !== undefined){
    //                         console.log(manager)
    //                         manager.age = calculateAge(manager.date_of_birth)
    //                         manager.league_id = seasonID
    //                         manager.nationality = getCountry(manager.nationality_id)
    //                         const fieldsToRemove = [
    //                             'city_id',
    //                             'common_name',
    //                             'country_id',
    //                             'date_of_birth',
    //                             'firstname',
    //                             'gender',
    //                             'height',
    //                             'lastname',
    //                             'name',
    //                             'nationality_id',
    //                             'player_id',
    //                             'sport_id',
    //                             'weight'
    //                         ];
    //                         for (const field of fieldsToRemove) {
    //                             delete manager[field];
    //                         }
    //                         let { data, error } = await supabase
    //                             .from(`${leaguePrefix}_managers`)
    //                             .upsert(manager)

    //                         if (error){
    //                             console.error('supa error: ', error)
    //                         }
    //                     }
                        
    //                 }
    //             }
	// 			console.log('managers', managers)

    //         }catch(err){
    //             console.error(err)
    //         }


    //     }catch(err){
    //         console.error(err)
    //     }
    // }



/////////////////
//Stat Rankings//
// async function statRankings(leagueString, seasonString) {
//     console.log(`[statRankings] Starting rankings for league: ${leagueString}, season: ${seasonString}`);
    
//     const ninetyTable = `${leagueString}_stats_${seasonString}_per90`
//     const rankTable = `${leagueString}_stats_${seasonString}_rankings`
    
//     console.log(`[statRankings] Tables - ninety: ${ninetyTable}, rank: ${rankTable}`);
    
//     const invertedStats = [
//         "ShotsOffTargetPer90",
//         "BigChancesMissedPer90",
//         "FoulsPer90",
//         "OffsidesPer90",
//         "GoalsConcededPer90",
//         "DispossessedPer90",
//         "DribbledPastPer90",
//         "ErrorLeadToGoal"
//     ];
    
//     console.log(`[statRankings] Fetching data from ${ninetyTable}`);
    
//     const { data, error } = await supabase
//         .from(ninetyTable)
//         .select('*');
    
//     if (error) {
//         console.error(`[statRankings] ERROR fetching from ${ninetyTable}:`, error);
//         console.error(`[statRankings] Error details:`, JSON.stringify(error));
//         return;
//     }
    
//     if (!data || data.length === 0) {
//         console.warn(`[statRankings] No data found in ${ninetyTable}`);
//         return;
//     }
    
//     console.log(`[statRankings] Fetched ${data.length} players from ${ninetyTable}`);
    
//     // Only get rankings for players with significant minutes (half of the maximum or greater)
//     const maxMinutes = Math.max(...data.map(player => player.MinutesPlayed));
//     console.log(`[statRankings] Max minutes played: ${maxMinutes}`);
    
//     const minutesThreshold = maxMinutes / 3;
//     console.log(`[statRankings] Minutes threshold (max/3): ${minutesThreshold}`);
    
//     const filteredPlayers = data.filter(player => player.MinutesPlayed >= minutesThreshold);
//     console.log(`[statRankings] ${filteredPlayers.length} players meet minutes threshold`);
    
//     // Separate players into keepers and non-keepers
//     const keepers = filteredPlayers.filter(player => player.DetailedPosition === 'Goalkeeper');
//     const nonKeepers = filteredPlayers.filter(player => player.DetailedPosition !== 'Goalkeeper');
    
//     console.log(`[statRankings] Found ${keepers.length} keepers and ${nonKeepers.length} non-keepers`);
    
//     // Initialize rankedData for all players
//     const rankedData = filteredPlayers.map(player => ({
//         id: player.id,
//         PlayerName: player.PlayerName,
//         DetailedPosition: player.DetailedPosition,
//         ...statsToRank.reduce((acc, stat) => {
//             acc[stat] = 0; // Initialize all stats to 0
//             return acc;
//         }, {}),
//         ...keeperStatsToRank.reduce((acc, stat) => {
//             acc[stat] = 0; // Initialize keeper stats to 0
//             return acc;
//         }, {})
//     }));
    
//     console.log(`[statRankings] Initialized ranked data for ${rankedData.length} players`);
    
//     // Helper function to rank players with tie handling
//     const rankPlayers = (players, stat, isInverted) => {
//         console.log(`[statRankings] Ranking ${players.length} players for stat: ${stat} (inverted: ${isInverted})`);
        
//         const sortedPlayers = [...players].sort((a, b) => isInverted ? a[stat] - b[stat] : b[stat] - a[stat]);
//         let currentRank = 1;
//         let previousValue = null;
//         let firstRankSet = false
        
//         sortedPlayers.forEach((player, index) => {
//             const playerInRankedData = rankedData.find(p => p.id === player.id);
            
//             if (!playerInRankedData) {
//                 console.error(`[statRankings] Could not find player ID ${player.id} in rankedData`);
//                 return;
//             }
            
//             const currentValue = player[stat];
            
//             if (currentValue !== previousValue && !firstRankSet){
//                 currentRank = 1
//                 firstRankSet = true;
//             }
//             else if (currentValue !== previousValue) {
//                 currentRank += 1; // Update rank if the value changes
//             }
            
//             if (currentRank <= 50) {
//                 playerInRankedData[stat] = currentRank; // Top 50
//             } else if (currentRank >= sortedPlayers.length - 49) {
//                 playerInRankedData[stat] = -(sortedPlayers.length - currentRank + 1); // Bottom 50
//             } else {
//                 playerInRankedData[stat] = 0; // Not in top or bottom 50
//             }
            
//             previousValue = currentValue; // Update previous value for the next iteration
//         });
        
//         console.log(`[statRankings] Completed ranking for stat: ${stat}`);
//     };
    
//     // Rank non-keepers using statsToRank
//     console.log(`[statRankings] Starting to rank non-keepers for ${statsToRank.length} stats`);
//     statsToRank.forEach(stat => {
//         const isInverted = invertedStats.includes(stat);
//         rankPlayers(nonKeepers, stat, isInverted);
//     });
    
//     // Rank keepers using keeperStatsToRank
//     console.log(`[statRankings] Starting to rank keepers for ${keeperStatsToRank.length} stats`);
//     keeperStatsToRank.forEach(stat => {
//         const isInverted = invertedStats.includes(stat);
//         rankPlayers(keepers, stat, isInverted);
//     });
    
//     console.log(`[statRankings] All rankings complete, upserting ${rankedData.length} records to ${rankTable}`);
//     console.log(`[statRankings] Sample ranked data (first player):`, JSON.stringify(rankedData[0]));
    
//     try {
//         const { rankings, err } = await supabase
//             .from(rankTable)
//             .upsert(rankedData, { onConflict: 'id' })
        
//         if (err) {
//             console.error(`[statRankings] ERROR upserting rankings to ${rankTable}:`, err);
//             console.error(`[statRankings] Error details:`, JSON.stringify(err));
//             console.error(`[statRankings] Failed data sample (first 3 records):`, JSON.stringify(rankedData.slice(0, 3)));
//         } else {
//             console.log(`[statRankings] Successfully uploaded ${rankedData.length} rankings to ${rankTable}`);
//             if (rankings) {
//                 console.log(`[statRankings] Returned data length:`, rankings.length);
//             }
//         }
//     } catch(err) {
//         console.error(`[statRankings] EXCEPTION during upsert:`, err);
//         console.error(`[statRankings] Exception stack:`, err.stack);
//     }
// }



function toggleDevBar() {
    devBarVisible = !devBarVisible;
  }
</script>

<div class="dev-bar-toggle">
    <button class="dev-button" onclick={toggleDevBar}>Toggle Dev Bar</button>
</div>
  


<!-- {#if devBarVisible}
    <div class="dev-bar">
        <button><a href={'/dev/weekly'}>Weekly Admin</a></button>
        <button><a href={'/dev/weight_tables'}>Weight Tables</a></button>
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
        <button onclick={getPlayerImages('prem_mini_2425_testing')}>Player Images Test</button>
        <button onclick={getPlayerImages('prem_mini_2425')}>Player Images to Mini</button> -->
    <!-- </div>  
{/if} --> 
{#if userStore.user}
    <h2>Signed in as {userStore.user ? userStore.user.signInDetails.loginId : null}</h2>
    <button onclick={signUserOut}>Logout</button>

    <button><a href="/main">League Page</a></button>
    {#if !draft.complete}
    <button><a href="/draft">To Draft</a></button>
    {/if}
    {#if draft.gate1}
    <button>
        <a href={'/table'}>League Table</a>
    </button>
    <button>
        <a href={'/injuries'}>Injuries</a>
    </button>
    <button>
        <a href={'/results'}>Results</a>
    </button>
    <LineupCountdown />
    {/if}
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
