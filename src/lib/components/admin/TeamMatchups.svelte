<script>
  import { supabase, supabaseScaling } from "$lib/client/supabase/supaClient";
  import { TABLE_PREFIXES } from "$lib/stores/league.svelte";
  import Simulator from "./Simulator.svelte";

  let isProcessing = $state(false);
  let statusMessage = $state('');
  let errorMessage = $state('');
  let matchupStats = $state(null);
  let loadedCountryCodes = $state(new Set());
  let leagueCountries = $state(new Map());

  // Store for passing to Simulate component
  let playerIds = $state({});
  let currentLeagueMatchups = $state([]);
  let currentLeagueId = $state(null);
  let playerScoresMap = $state(new Map());
  let allSimulationResults = $state([]);
  let testMode = $state(false)

  let matchweeksByCountry = new Map()

  async function handleSimulationComplete(results) {
    allSimulationResults = [...allSimulationResults, results];
    console.log('League completed:', results.leagueId, 'Total results:', allSimulationResults.length);
    
    if (!results.testMode) {
        await saveMatchResults(results);
        await savePlayerStats(results, '2526')
        await updateTeamStandings(results)
    }
  }

  async function loadMatchweeks() {
    const { data, error } = await supabase
        .from('league_info_reference')
        .select('country_code, current_matchweek')
    
    if (error) {
        console.error('Error fetching matchweeks:', error);
        return;
    }
    
    data.forEach(row => {
        matchweeksByCountry.set(row.country_code, row.current_matchweek);
    });
    
    console.log('Loaded matchweeks:', matchweeksByCountry);
  }

  async function loadPlayers(countriesCode) {
      try {
          if (!TABLE_PREFIXES[countriesCode]) {
              console.warn(`Invalid countries code ${countriesCode}`);
              return false;
          }

          const season = '2526';
          const tableName = `${TABLE_PREFIXES[countriesCode]}_mini_${season}`;
          console.log(`Loading players from table: ${tableName} for countries code: ${countriesCode}`);

          const { data: players, error } = await supabase
              .from(tableName)
              .select('*')
              .order('transfer_value', { ascending: false });

          if (error) {
              console.error(`Error loading players from ${tableName}:`, error);
              return false;
          }

          if (players && players.length > 0) {
              for (const player of players) {
                  playerIds[player.id] = player;
              }
              
              playerIds = {...playerIds};

              console.log(`Loaded ${players.length} players from ${tableName}`);
              console.log('playerIds count:', Object.keys(playerIds).length);
              return true;
          }

          return false;
      } catch (error) {
          console.error('Error loading players:', error);
          return false;
      }
  }


  // Create lookup of league country codes
  async function loadCountryCodes() {
    const codesMap = new Map();
    
    const { data: leagues, error } = await supabaseScaling
        .from('leagues')
        .select('league_id, countries_code');

    if (error) throw new Error(`Failed to load leagues: ${error.message}`);

    leagues.forEach(league => {
        codesMap.set(league.league_id, league.countries_code);
    });

    console.log(`Loaded ${codesMap.size} league country codes into map`);
    return codesMap;
  }

  // Load all player scores into memory
  async function loadPlayerScores() {
    const scoresMap = new Map();
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: scores, error } = await supabase
        .from('current_week_scores')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to load player scores: ${error.message}`);
      
      scores.forEach(score => {
        scoresMap.set(score.player_id, score);
      });
      
      hasMore = scores.length === limit;
      offset += limit;
    }
    
    console.log(`Loaded ${scoresMap.size} player scores into map`);
    console.log('ScoresMap as object:', Object.fromEntries(scoresMap));
    
    return scoresMap;
  }
  
  // Phase 2: Prepare all matchups from team_players data
  async function prepareAllMatchups() {
    const { data: allTeams, error } = await supabaseScaling
      .from('team_players')
      .select('team_id, league_id, selected, subs, next_matchup, home')
      .not('next_matchup', 'is', null);
    
    if (error) throw new Error(`Failed to fetch team players: ${error.message}`);
    
    // Group by league_id first, then by team_id
    const leagueMap = new Map();
    
    allTeams.forEach(team => {
      if (!leagueMap.has(team.league_id)) {
        leagueMap.set(team.league_id, new Map());
      }
      
      const teamMap = leagueMap.get(team.league_id);
      teamMap.set(team.team_id, {
        teamId: team.team_id,
        leagueId: team.league_id,
        selected: team.selected,
        subs: team.subs,
        nextMatchup: team.next_matchup,
        home: team.home
      });
    });
    
    // Create matchup pairs per league
    const allMatchups = [];
    
    leagueMap.forEach((teamMap, leagueId) => {
      const processed = new Set();
      
      teamMap.forEach((teamData, teamId) => {
        if (processed.has(teamId)) return;
        
        const opponentData = teamMap.get(teamData.nextMatchup);
        if (!opponentData) return;
        
        processed.add(teamId);
        processed.add(teamData.nextMatchup);
        
        const matchup = {
          matchupId: `${teamId}_${teamData.nextMatchup}`,
          leagueId: leagueId,
          homeTeam: teamData.home ? teamData : opponentData,
          awayTeam: teamData.home ? opponentData : teamData
        };
        
        allMatchups.push(matchup);
      });
    });
    
    return allMatchups;
  }
  
  // Main processing function
  async function processAllMatchups() {
    isProcessing = true;
    errorMessage = '';
    matchupStats = null;
    statusMessage = 'Loading league codes and player scores...';
    
    try {
      leagueCountries = await loadCountryCodes();
      playerScoresMap = await loadPlayerScores();
      await loadMatchweeks()
      console.log(`Loaded ${leagueCountries.size} league country codes`)
      statusMessage = `Loaded ${playerScoresMap.size} player scores`;
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI update
      
      statusMessage = 'Preparing matchups from all leagues...';
      const allMatchups = await prepareAllMatchups();
      
      // Group matchups by league for processing
      const matchupsByLeague = new Map();
      allMatchups.forEach(matchup => {
        if (!matchupsByLeague.has(matchup.leagueId)) {
          matchupsByLeague.set(matchup.leagueId, []);
        }
        matchupsByLeague.get(matchup.leagueId).push(matchup);
      });
      
      console.log('Matchups by league:', matchupsByLeague);
      
      matchupStats = {
        totalMatchups: allMatchups.length,
        totalLeagues: matchupsByLeague.size,
        matchupsByLeague: Object.fromEntries(
          Array.from(matchupsByLeague.entries()).map(([leagueId, matchups]) => [leagueId, matchups.length])
        )
      };
      
      statusMessage = `Simulating ${allMatchups.length} matchups across ${matchupsByLeague.size} leagues...`;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Process each league's matchups
      let leagueCount = 0;

      for (const [leagueId, leagueMatchups] of matchupsByLeague) {
          const countryCode = leagueCountries.get(leagueId);
          if (countryCode && !loadedCountryCodes.has(countryCode)) {
              statusMessage = `Loading players for country code ${countryCode}...`;
              await loadPlayers(countryCode);
              loadedCountryCodes.add(countryCode);
              console.log(`Loaded players for country code ${countryCode}`);
          }
      }

      console.log('All players loaded. Total:', Object.keys(playerIds).length);

      for (const [leagueId, leagueMatchups] of matchupsByLeague) {
        leagueCount++;
        statusMessage = `Processing League ${leagueId} (${leagueCount}/${matchupsByLeague.size}) - ${leagueMatchups.length} matchups...`;
        
        // Get country code for this league and load players if needed
        const countryCode = leagueCountries.get(leagueId);
        if (countryCode && !loadedCountryCodes.has(countryCode)) {
            await loadPlayers(countryCode);
            loadedCountryCodes.add(countryCode);
            console.log(`Loaded players for country code ${countryCode}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // Set data for Simulate component
        currentLeagueId = leagueId;
        currentLeagueMatchups = leagueMatchups;
        
      
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      statusMessage = '✅ Simulation complete!';
      
      return { matchupsByLeague, playerScores: playerScoresMap };
      
    } catch (error) {
      errorMessage = error.message;
      statusMessage = '';
      console.error(error);
    } finally {
      isProcessing = false;
    }
  }
  
  function handleProcessMatchups() {
    processAllMatchups();
  }

  async function saveMatchResults(leagueResult) {
    const { leagueId, matchResults } = leagueResult;
    const season = '2526'; 
    
    const countryCode = leagueCountries.get(leagueId)
    if(!countryCode){
      throw new Error('Failed to retrieve country code')
    }
    const gameweek = matchweeksByCountry.get(countryCode) 
    if(!gameweek){
      throw new Error('Failed to retrieve game week')
    }
    
    // Delete existing results for this league/gameweek/season
    const { error: deleteError } = await supabaseScaling
        .from('match_results')
        .delete()
        .eq('league_id', leagueId)
        .eq('season', season)
        .eq('gameweek', gameweek);
    
    if (deleteError) {
        console.error('Error deleting existing match results:', deleteError);
        throw new Error('Failed to clear existing results');
    }

    console.log(`Cleared existing results for league ${leagueId}, gameweek ${gameweek}`);
    for (const [matchupId, result] of Object.entries(matchResults)) {
        
        
        // Insert match_results
        const { data: matchData, error: matchError } = await supabaseScaling
            .from('match_results')
            .insert({
                league_id: leagueId,
                season,
                gameweek,
                home_team_id: result.homeTeamId,
                away_team_id: result.awayTeamId,
                home_score: result.score.home,
                away_score: result.score.away,
                home_chance_pts: result.chancePoints.home.total,
                away_chance_pts: result.chancePoints.away.total,
                home_possession_wins: result.possessionBreakdown?.home?.total || 0,
                away_possession_wins: result.possessionBreakdown?.away?.total || 0
            })
            .select('id')
            .single();
        
        if (matchError) {
            console.error('Error saving match result:', matchError);
            continue;
        }
        
        // Insert match_details
        const { error: detailsError } = await supabaseScaling
            .from('match_details')
            .insert({
                match_id: matchData.id,
                goal_details: {
                    home: result.goalDetails.home,
                    away: result.goalDetails.away
                },
                chance_breakdown: {
                    home: {
                        total: result.chancePoints.home.total,
                        byGroup: result.chancePoints.home.byGroup,
                        byZone: result.chancePoints.home.byZone
                    },
                    away: {
                        total: result.chancePoints.away.total,
                        byGroup: result.chancePoints.away.byGroup,
                        byZone: result.chancePoints.away.byZone
                    }
                },
                possession_breakdown: result.possessionBreakdown,
                scoring_checks_summary: {
                    home: {
                        totalChecks: result.goalDetails.home.length + (result.chancePoints.home.total > 0 ? Math.floor(result.chancePoints.home.total / 3) : 0),
                        goals: result.score.home
                    },
                    away: {
                        totalChecks: result.goalDetails.away.length + (result.chancePoints.away.total > 0 ? Math.floor(result.chancePoints.away.total / 3) : 0),
                        goals: result.score.away
                    }
                }
            });
        
        if (detailsError) {
            console.error('Error saving match details:', detailsError);
        }
    }
    
    console.log(`Saved ${Object.keys(matchResults).length} matches for league ${leagueId}`);
  }


  async function updateTeamStandings(leagueResult) {
    const { leagueId, matchResults } = leagueResult;
    
    for (const [matchupId, result] of Object.entries(matchResults)) {
        const homeTeamId = result.homeTeamId;
        const awayTeamId = result.awayTeamId;
        const homeScore = result.score.home;
        const awayScore = result.score.away;
        
        // Fetch current home team stats
        const { data: homeTeam } = await supabaseScaling
            .from('teams')
            .select('wins, draws, losses, points, goals_for, goals_against')
            .eq('team_id', homeTeamId)
            .single();
        
        // Fetch current away team stats
        const { data: awayTeam } = await supabaseScaling
            .from('teams')
            .select('wins, draws, losses, points, goals_for, goals_against')
            .eq('team_id', awayTeamId)
            .single();
        
        let homeUpdate = {
            wins: homeTeam?.wins || 0,
            draws: homeTeam?.draws || 0,
            losses: homeTeam?.losses || 0,
            points: homeTeam?.points || 0,
            goals_for: (homeTeam?.goals_for || 0) + homeScore,
            goals_against: (homeTeam?.goals_against || 0) + awayScore
        };
        
        let awayUpdate = {
            wins: awayTeam?.wins || 0,
            draws: awayTeam?.draws || 0,
            losses: awayTeam?.losses || 0,
            points: awayTeam?.points || 0,
            goals_for: (awayTeam?.goals_for || 0) + awayScore,
            goals_against: (awayTeam?.goals_against || 0) + homeScore
        };
        
        if (homeScore > awayScore) {
            homeUpdate.wins++;
            homeUpdate.points += 3;
            awayUpdate.losses++;
        } else if (homeScore < awayScore) {
            homeUpdate.losses++;
            awayUpdate.wins++;
            awayUpdate.points += 3;
        } else {
            homeUpdate.draws++;
            awayUpdate.draws++;
            homeUpdate.points++;
            awayUpdate.points++;
        }
        
        // Update home team
        const { error: homeError } = await supabaseScaling
            .from('teams')
            .update(homeUpdate)
            .eq('team_id', homeTeamId);
        
        if (homeError) console.error('Error updating home team:', homeError);
        
        // Update away team
        const { error: awayError } = await supabaseScaling
            .from('teams')
            .update(awayUpdate)
            .eq('team_id', awayTeamId);
        
        if (awayError) console.error('Error updating away team:', awayError);
    }
    
    console.log(`Updated standings for ${Object.keys(matchResults).length * 2} teams`);
  }

  async function savePlayerStats(results, season) {
    const statsUpdates = new Map(); // keyed by `${leagueId}_${playerId}`
    
    for (const [matchupId, match] of Object.entries(results.matchResults)) {
        const leagueId = results.leagueId;
        
        // Track appearances
        match.homePlayers.forEach(playerId => {
            const key = `${leagueId}_${playerId}`;
            if (!statsUpdates.has(key)) {
                statsUpdates.set(key, { league_id: leagueId, player_id: playerId, season, goals: 0, assists: 0, clean_sheets: 0, appearances: 0 });
            }
            statsUpdates.get(key).appearances++;
        });
        
        match.awayPlayers.forEach(playerId => {
            const key = `${leagueId}_${playerId}`;
            if (!statsUpdates.has(key)) {
                statsUpdates.set(key, { league_id: leagueId, player_id: playerId, season, goals: 0, assists: 0, clean_sheets: 0, appearances: 0 });
            }
            statsUpdates.get(key).appearances++;
        });
        
        // Track goals and assists
        [...match.goalDetails.home, ...match.goalDetails.away].forEach(goal => {
            const key = `${leagueId}_${goal.scorerPlayerId}`;
            if (statsUpdates.has(key)) {
                statsUpdates.get(key).goals++;
            }
            
            if (goal.assister) {
                const assistKey = `${leagueId}_${goal.assister}`;
                if (statsUpdates.has(assistKey)) {
                    statsUpdates.get(assistKey).assists++;
                }
            }
        });
        
        const homeCleanSheet = match.score.away === 0;
        const awayCleanSheet = match.score.home === 0;

        if (homeCleanSheet) {
            [...(match.homeKeepers || []), ...(match.homeDefenders || [])].forEach(playerId => {
                const key = `${leagueId}_${playerId}`;
                if (statsUpdates.has(key)) {
                    statsUpdates.get(key).clean_sheets++;
                }
            });
        }

        if (awayCleanSheet) {
            [...(match.awayKeepers || []), ...(match.awayDefenders || [])].forEach(playerId => {
                const key = `${leagueId}_${playerId}`;
                if (statsUpdates.has(key)) {
                    statsUpdates.get(key).clean_sheets++;
                }
            });
        }
      }
    
    // Upsert all stats
    const updates = Array.from(statsUpdates.values());
    
    const { error } = await supabaseScaling
        .from('fantasy_stats')
        .upsert(updates, { 
            onConflict: 'league_id,player_id,season',
            ignoreDuplicates: false 
        });
    
    if (error) {
        console.error('Failed to save player stats:', error);
    } else {
        console.log(`Saved stats for ${updates.length} players`);
    }
  }

  function resetSimulation() {
    statusMessage = '';
    errorMessage = '';
    matchupStats = null;
    allSimulationResults = [];
  }
</script>

<div class="simulator-container">
  <div class="header">
    <h2>Matchup Simulator</h2>
    <p class="subtitle">Process and simulate all league matchups</p>
  </div>
  
  <div class="content">
 
    {#if statusMessage}
      <div class="status-box" class:success={statusMessage.includes('✅')}>
        <div class="status-icon">
          {#if isProcessing}
            <div class="spinner"></div>
          {:else if statusMessage.includes('✅')}
            <span>✅</span>
          {:else}
            <span>📊</span>
          {/if}
        </div>
        <p class="status-message">{statusMessage}</p>
      </div>
    {/if}
    

    {#if errorMessage}
      <div class="error-box">
        <span class="error-icon">⚠️</span>
        <p class="error-message">{errorMessage}</p>
      </div>
    {/if}
    
 
    {#if matchupStats}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{matchupStats.totalMatchups}</div>
          <div class="stat-label">Total Matchups</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{matchupStats.totalLeagues}</div>
          <div class="stat-label">Active Leagues</div>
        </div>
      </div>
      
      {#if Object.keys(matchupStats.matchupsByLeague).length > 0}
        <div class="league-breakdown">
          <h3>League Breakdown</h3>
          <div class="league-list">
            {#each Object.entries(matchupStats.matchupsByLeague) as [leagueId, count]}
              <div class="league-item">
                <span class="league-id">League {leagueId}</span>
                <span class="league-count">{count} matchups</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    
    <div class="mode-toggle">
      <label class="toggle-label">
          <input 
              type="checkbox" 
              bind:checked={testMode}
              disabled={isProcessing}
          />
          <span class="toggle-text">Test Mode {testMode ? '(5 runs, no save)' : '(1 run, saves to DB)'}</span>
      </label>
    </div>
    <div class="button-group">
      <button 
        class="btn btn-primary"
        onclick={handleProcessMatchups}
        disabled={isProcessing}
      >
        {#if isProcessing}
          <span class="btn-spinner"></span>
          Processing...
        {:else}
          Process All Matchups
        {/if}
      </button>
      
      {#if (statusMessage || errorMessage || matchupStats) && !isProcessing}
        <button 
          class="btn btn-secondary"
          onclick={resetSimulation}
        >
          🔄 Reset
        </button>
      {/if}
    </div>
  </div>
</div>

{#if allSimulationResults.length > 0}
  <div class="results-container">
    <h3>Match Results</h3>
    {#each allSimulationResults as leagueResult}
      <div class="league-results">
        <h4>League {leagueResult.leagueId}</h4>
        {#each Object.entries(leagueResult.matchResults) as [matchupId, result]}
          <div class="match-result">
            <div class="score-line">
              <span>Home {result.score.home} - {result.score.away} Away</span>
            </div>
            {#if result.goalDetails.home.length > 0 || result.goalDetails.away.length > 0}
              <div class="goals">
               {#each result.goalDetails.home as goal}
                  <div class="goal home">
                    <span class="minute">{goal.minute}'</span>
                    <span class="scorer">{goal.scorerName}</span>
                    {#if goal.type === 'assisted' && goal.assister}
                      <span class="assist">(assist: {playerIds[goal.assister]?.player_name || 'Unknown'})</span>
                    {:else if goal.type === 'corner' && goal.creator}
                      <span class="assist">(corner: {playerIds[goal.creator]?.player_name || 'Unknown'})</span>
                    {:else if goal.type === 'solo' || goal.type === 'solo_fallback'}
                      <span class="assist">(solo)</span>
                    {/if}
                  </div>
                {/each}
                {#each result.goalDetails.away as goal}
                  <div class="goal away">
                    <span class="minute">{goal.minute}'</span>
                    <span class="scorer">{goal.scorerName}</span>
                    {#if goal.type === 'assisted' && goal.assister}
                      <span class="assist">(assist: {playerIds[goal.assister]?.player_name || 'Unknown'})</span>
                    {:else if goal.type === 'corner' && goal.creator}
                      <span class="assist">(corner: {playerIds[goal.creator]?.player_name || 'Unknown'})</span>
                    {:else if goal.type === 'solo' || goal.type === 'solo_fallback'}
                      <span class="assist">(solo)</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

{#if currentLeagueId && currentLeagueMatchups.length > 0 && playerScoresMap.size > 0}
  {#key currentLeagueId}
    <Simulator 
      playersMap={playerIds}
      scoreMap={playerScoresMap}
      leagueMatchups={currentLeagueMatchups}
      leagueId={currentLeagueId}
      onSimulationComplete={handleSimulationComplete}
      {testMode}
    />
  {/key}
{/if}

<style>
  .simulator-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .header h2 {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.5rem 0;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
    margin: 0;
  }
  
  .content {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }
  
  .status-box {
    background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    border: 2px solid #667eea30;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
  }
  
  .status-box.success {
    background: linear-gradient(135deg, #10b98115 0%, #10b98110 100%);
    border-color: #10b98130;
  }
  
  .status-icon {
    flex-shrink: 0;
  }
  
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #667eea20;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .status-message {
    margin: 0;
    color: #4a5568;
    font-weight: 500;
  }
  
  .error-box {
    background: #fee;
    border: 2px solid #fcc;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .error-icon {
    font-size: 1.25rem;
  }
  
  .error-message {
    margin: 0;
    color: #c53030;
    font-weight: 500;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1.25rem;
    text-align: center;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .league-breakdown {
    margin-bottom: 1.5rem;
  }
  
  .league-breakdown h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #4a5568;
    margin: 0 0 0.75rem 0;
  }
  
  .league-list {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .league-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    transition: background 0.2s ease;
  }
  
  .league-item:hover {
    background: white;
  }
  
  .league-id {
    font-weight: 500;
    color: #4a5568;
  }
  
  .league-count {
    font-size: 0.875rem;
    color: #718096;
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(102, 126, 234, 0.4);
  }
  
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background: white;
    color: #667eea;
    border: 2px solid #667eea30;
  }
  
  .btn-secondary:hover {
    background: #f7fafc;
  }
  
  .btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  /* Scrollbar styling for league list */
  .league-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .league-list::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 3px;
  }
  
  .league-list::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
  }
  
  .league-list::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }

  .results-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .league-results {
    margin-bottom: 1.5rem;
  }

  .league-results h4 {
    color: #667eea;
    border-bottom: 2px solid #667eea30;
    padding-bottom: 0.5rem;
  }

  .match-result {
    padding: 0.75rem;
    margin: 0.5rem 0;
    background: #f7fafc;
    border-radius: 0.5rem;
  }

  .score-line {
    font-weight: 600;
    font-size: 1.1rem;
  }

  .goals {
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }

  .goal {
    padding: 0.25rem 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .minute {
    font-weight: 600;
    min-width: 2.5rem;
  }

  .scorer {
    font-weight: 500;
  }

  .assist {
    color: #718096;
    font-size: 0.8rem;
    font-style: italic;
  }

  .goal.home { color: #2563eb; }
  .goal.away { color: #dc2626; }

  .mode-toggle {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f7fafc;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
  }

  .toggle-label input {
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
  }

  .toggle-label input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
  }

  .toggle-text {
      font-weight: 500;
      color: #4a5568;
  }
</style>