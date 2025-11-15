<script lang="ts">
  let {
    scoreMap = new Map(),
    leagueMatchups = [],
    leagueId = 0,
  } = $props<{
    scoreMap?: Map<number, any>;
    leagueMatchups?: Array<any>;
    leagueId?: number;
  }>();

  function simulateMatchups() {
    console.log(`\n========================================`);
    console.log(`SIMULATING LEAGUE ${leagueId}`);
    console.log(`Total matchups to process: ${leagueMatchups.length}`);
    console.log(`========================================\n`);
    
    leagueMatchups.forEach((matchup, index) => {
      console.log(`\n--- Matchup ${index + 1}/${leagueMatchups.length} ---`);
      console.log(`Matchup ID: ${matchup.matchupId}`);
      console.log(`Home Team: ${matchup.homeTeam.teamId}`);
      console.log(`Away Team: ${matchup.awayTeam.teamId}`);
      
      const result = simulateMatchup(matchup, scoreMap);
      
      if (result) {
        console.log(`Result processed for matchup ${matchup.matchupId}`);
      }
    });
    
    console.log(`\n✅ Completed simulation for League ${leagueId}\n`);
  }

  function simulateMatchup(matchup, scoreMap) {
    const { homeTeam, awayTeam, matchupId } = matchup;
    
    console.log('\nHome Team Roster:');
    console.log('Selected players:', homeTeam.selected);
    console.log('Subs:', homeTeam.subs);
    
    console.log('\nAway Team Roster:');
    console.log('Selected players:', awayTeam.selected);
    console.log('Subs:', awayTeam.subs);
    
    return {
      matchupId,
      status: 'simulated',
    };
  }

  $effect(() => {
    if (leagueMatchups.length > 0 && scoreMap.size > 0) {
      simulateMatchups();
    }
  });
</script>