<script>
   import { supabase, supabaseScaling } from "$lib/client/supabase/ 

    let isProcessing = false;
    let statusMessage = '';
  
// Phase 1: Load all player scores into memory
async function loadPlayerScores() {
    const { data: scores, error } = await supabase
      .from('current_week_scores')
      .select('*');
    
    if (error) throw new Error(`Failed to load player scores: ${error.message}`);
    
    const scoresMap = new Map();
    scores.forEach(score => {
      scoresMap.set(score.player_id, score);
    });
    
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
    statusMessage = 'Loading player scores...';
    
    try {
      const playerScoresMap = await loadPlayerScores();
      statusMessage = `Loaded ${playerScoresMap.size} player scores`;
      
      statusMessage = 'Preparing matchups from all leagues...';
      const allMatchups = await prepareAllMatchups();
      
      // Group matchups by league for reporting
      const matchupsByLeague = new Map();
      allMatchups.forEach(matchup => {
        if (!matchupsByLeague.has(matchup.leagueId)) {
          matchupsByLeague.set(matchup.leagueId, 0);
        }
        matchupsByLeague.set(matchup.leagueId, matchupsByLeague.get(matchup.leagueId) + 1);
      });
      
      console.log('Matchups by league:', Object.fromEntries(matchupsByLeague));
      statusMessage = `Ready to simulate ${allMatchups.length} matchups across ${matchupsByLeague.size} leagues`;
      
      // Here you would pass both allMatchups and playerScoresMap to your simulation function
      // simulateMatchups(allMatchups, playerScoresMap);
      
      return { matchups: allMatchups, playerScores: playerScoresMap };
      
    } catch (error) {
      statusMessage = `Error: ${error.message}`;
      console.error(error);
    } finally {
      isProcessing = false;
    }
}
  
function handleProcessMatchups() {
    processAllMatchups();
}
</script>