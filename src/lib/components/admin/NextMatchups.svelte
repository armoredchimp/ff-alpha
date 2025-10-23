<script>
  import { supabase, supabaseScaling } from "$lib/client/supabase/supaClient";
  
  let isUpdating = false;
  let statusMessage = '';
  let statusType = 'info'; // 'info', 'success', 'error'
  let progress = { current: 0, total: 0 };
  let errors = [];

  async function updateNextMatchups() {
    isUpdating = true;
    statusMessage = 'Loading leagues...';
    statusType = 'info';
    errors = [];
    progress = { current: 0, total: 0 };
    
    try {
      // Get all leagues with schedules
      const { data: leagues, error: leaguesError } = await supabaseScaling
        .from('leagues')
        .select('league_id, countries_code, schedule')
        .not('schedule', 'is', null);
      
      if (leaguesError) throw new Error(`Failed to fetch leagues: ${leaguesError.message}`);
      
      if (!leagues || leagues.length === 0) {
        statusMessage = 'No leagues with schedules found';
        statusType = 'info';
        return;
      }
      
      // Get all country codes at once
      const countryCodes = leagues
        .filter(l => l.countries_code)
        .map(l => l.countries_code);
      
      if (countryCodes.length === 0) {
        statusMessage = 'No leagues with valid country codes';
        statusType = 'error';
        return;
      }
      
      // Batch fetch all matchweek info
      const { data: leagueInfos, error: infoError } = await supabase
        .from('league_info_reference')
        .select('country_code, current_matchweek')
        .in('country_code', countryCodes);
      
      if (infoError) throw new Error(`Failed to fetch matchweek info: ${infoError.message}`);
      
      // Create lookup map for matchweeks
      const matchweekMap = new Map();
      leagueInfos?.forEach(info => {
        matchweekMap.set(info.country_code, info.current_matchweek);
      });
      
      progress.total = leagues.length;
      let successCount = 0;
      let skipCount = 0;
      
      // Process leagues in parallel batches (5 at a time to avoid overwhelming the database)
      const batchSize = 5;
      for (let i = 0; i < leagues.length; i += batchSize) {
        const batch = leagues.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (league) => {
          try {
            if (!league.countries_code || !league.schedule) {
              skipCount++;
              return;
            }
            
            const currentMatchweek = matchweekMap.get(league.countries_code);
            if (!currentMatchweek) {
              errors.push(`League ${league.league_id}: No matchweek found for country ${league.countries_code}`);
              return;
            }
            
            const matchups = league.schedule[currentMatchweek.toString()];
            if (!matchups) {
              errors.push(`League ${league.league_id}: No schedule for matchweek ${currentMatchweek}`);
              return;
            }
            
            // Get all teams in this league
            const { data: teams, error: teamsError } = await supabaseScaling
              .from('teams')
              .select('team_id, frontend_number')
              .eq('league_id', league.league_id);
            
            if (teamsError) {
              errors.push(`League ${league.league_id}: ${teamsError.message}`);
              return;
            }
            
            if (!teams || teams.length === 0) {
              errors.push(`League ${league.league_id}: No teams found`);
              return;
            }
            
            // Create mapping
            const frontendToTeamId = new Map();
            teams.forEach(team => {
              if (team.frontend_number !== null) {
                frontendToTeamId.set(team.frontend_number, team.team_id);
              }
            });
            
            // Build all updates for this league
            const updates = [];
            for (const [home, away] of matchups) {
              const homeTeamId = frontendToTeamId.get(home);
              const awayTeamId = frontendToTeamId.get(away);
              
              if (homeTeamId && awayTeamId) {
                updates.push(
                  { team_id: homeTeamId, next_matchup: awayTeamId },
                  { team_id: awayTeamId, next_matchup: homeTeamId }
                );
              }
            }
            
            // Batch update using Promise.all for this league
            if (updates.length > 0) {
              const updatePromises = updates.map(update =>
                supabaseScaling
                  .from('teams')
                  .update({ next_matchup: update.next_matchup })
                  .eq('team_id', update.team_id)
              );
              
              const results = await Promise.allSettled(updatePromises);
              const failedUpdates = results.filter(r => r.status === 'rejected');
              
              if (failedUpdates.length > 0) {
                errors.push(`League ${league.league_id}: ${failedUpdates.length} team updates failed`);
              } else {
                successCount++;
              }
            }
          } catch (leagueError) {
            errors.push(`League ${league.league_id}: ${leagueError.message}`);
          } finally {
            progress.current++;
            statusMessage = `Processing: ${progress.current}/${progress.total} leagues`;
          }
        }));
      }
      
      // Final status
      if (errors.length === 0) {
        statusMessage = `✓ Successfully updated ${successCount} leagues!`;
        statusType = 'success';
      } else {
        statusMessage = `⚠ Completed with ${errors.length} errors (${successCount} leagues succeeded)`;
        statusType = 'error';
      }
      
    } catch (error) {
      console.error('Critical error:', error);
      statusMessage = `✗ Critical error: ${error.message}`;
      statusType = 'error';
      errors = [error.message];
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="matchup-updater">
  <div class="header">
    <h3>Next Matchup Updater</h3>
    <button 
      class="update-btn {isUpdating ? 'updating' : ''}" 
      onclick={updateNextMatchups} 
      disabled={isUpdating}
    >
      {isUpdating ? '⟳ Updating...' : '▶ Update Next Matchups'}
    </button>
  </div>
  
  {#if statusMessage}
    <div class="status-message {statusType}">
      {statusMessage}
    </div>
  {/if}
  
  {#if isUpdating && progress.total > 0}
    <div class="progress-container">
      <progress value={progress.current} max={progress.total}></progress>
      <span class="progress-text">{progress.current}/{progress.total}</span>
    </div>
  {/if}
  
  {#if errors.length > 0}
    <div class="errors-container">
      <div class="errors-header">Errors ({errors.length}):</div>
      <ul class="errors-list">
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .matchup-updater {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
    margin: 16px 0;
    max-width: 600px;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
  }
  
  .update-btn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .update-btn:hover:not(:disabled) {
    background: #45a049;
  }
  
  .update-btn:disabled {
    background: #999;
    cursor: not-allowed;
  }
  
  .update-btn.updating {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  
  .status-message {
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 14px;
  }
  
  .status-message.info {
    background: #e3f2fd;
    color: #1976d2;
    border: 1px solid #90caf9;
  }
  
  .status-message.success {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #81c784;
  }
  
  .status-message.error {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ef5350;
  }
  
  .progress-container {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  progress {
    flex: 1;
    height: 20px;
    border-radius: 4px;
  }
  
  progress::-webkit-progress-bar {
    background-color: #e0e0e0;
    border-radius: 4px;
  }
  
  progress::-webkit-progress-value {
    background-color: #4CAF50;
    border-radius: 4px;
  }
  
  .progress-text {
    font-size: 12px;
    color: #666;
    min-width: 50px;
  }
  
  .errors-container {
    background: #fff;
    border: 1px solid #ffcdd2;
    border-radius: 4px;
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .errors-header {
    font-weight: 500;
    color: #c62828;
    margin-bottom: 8px;
    font-size: 14px;
  }
  
  .errors-list {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    color: #666;
  }
  
  .errors-list li {
    margin: 4px 0;
  }
</style>