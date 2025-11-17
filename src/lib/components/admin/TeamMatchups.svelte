<script>
  import { supabase, supabaseScaling } from "$lib/client/supabase/supaClient";
  import Simulator from "./Simulator.svelte";
  
  let isProcessing = false;
  let statusMessage = '';
  let errorMessage = '';
  let matchupStats = null;
  
  // Store for passing to Simulate component
  let currentLeagueMatchups = [];
  let currentLeagueId = null;
  let playerScoresMap = new Map();
  
  // Phase 1: Load all player scores into memory
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
    statusMessage = 'Loading player scores...';
    
    try {
      playerScoresMap = await loadPlayerScores();
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
        leagueCount++;
        statusMessage = `Processing League ${leagueId} (${leagueCount}/${matchupsByLeague.size}) - ${leagueMatchups.length} matchups...`;
        
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
  
  function resetSimulation() {
    statusMessage = '';
    errorMessage = '';
    matchupStats = null;
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
    
    <div class="button-group">
      <button 
        class="btn btn-primary"
        on:click={handleProcessMatchups}
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
          on:click={resetSimulation}
        >
          🔄 Reset
        </button>
      {/if}
    </div>
  </div>
</div>


{#if currentLeagueId && currentLeagueMatchups.length > 0 && playerScoresMap.size > 0}
  {#key currentLeagueId}
    <Simulator 
      scoreMap={playerScoresMap}
      leagueMatchups={currentLeagueMatchups}
      leagueId={currentLeagueId}
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
</style>