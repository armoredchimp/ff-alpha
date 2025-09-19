<script lang="ts">
    import type { Team } from "./types/types";
    import { playerLastName } from "./utils/common";
    import { getPlayersFromGroup } from "./utils/team";
    import { recalculateSectionScores } from "./utils/team";
   
    let {
        group = '',
        team = {} as Team,
        opponentTeam = {} as Team,
        opponentMode = 0
    } = $props<{
        group: string;
        team: Team,
        opponentTeam: Team,
        opponentMode: number
    }>();
    
    recalculateSectionScores(opponentTeam);

    // Determine which opponent group to display based on opponentMode
    function getOpponentGroup(group: string, mode: number): string | null {
        if (mode === 0) {
            return group; // Comparison mode - same group
        } else {
            // Matchup mode
            switch(group) {
                case 'keepers':
                    return null; // Don't show anything for keepers in matchup mode
                case 'attackers':
                    return 'defenders'; // Attackers vs Defenders
                case 'defenders':
                    return 'attackers'; // Defenders vs Attackers
                case 'midfielders':
                    return 'midfielders'; // Midfielders vs Midfielders
                default:
                    return group;
            }
        }
    }

    const opponentGroupToDisplay = $derived(getOpponentGroup(group, opponentMode));

    // Get players for each team from the group
    const teamPlayers = $derived(getPlayersFromGroup(team, group));
    const opponentPlayers = $derived(
        opponentGroupToDisplay ? getPlayersFromGroup(opponentTeam, opponentGroupToDisplay) : []
    );

    // Calculate dilution factor based on player count
    function getDilutionFactor(playerCount: number): number {
        if (playerCount <= 1) return 1;
        return Math.max(0.1, 1 - (playerCount - 1) * 0.1);
    }

    // Get the appropriate scores for the group with dilution applied
    const teamScores = $derived(getGroupScoresWithDilution(team, group, teamPlayers.length));
    const opponentScores = $derived(
        opponentGroupToDisplay 
            ? getGroupScoresWithDilution(opponentTeam, opponentGroupToDisplay, opponentPlayers.length)
            : {}
    );
    
    // Check if we have players
    const hasPlayers = $derived(teamPlayers.length > 0 || opponentPlayers.length > 0);
    const hasBothTeams = $derived(teamPlayers.length > 0 && opponentPlayers.length > 0);
    
    // Calculate score differences for horizontal bars
    const scoreDifferences = $derived(calculateScoreDifferences());

    function getGroupScoresWithDilution(team: Team, group: string, playerCount: number) {
        if (!team.scores) return {};
        
        const dilutionFactor = getDilutionFactor(playerCount);
        
        // Map the group name to the correct scores object
        const groupMap: Record<string, any> = {
            'attackers': team.scores.attackers,
            'midfielders': team.scores.midfielders,
            'defenders': team.scores.defenders,
            'keepers': team.scores.keeper
        };
        
        const baseScores = groupMap[group] || {};
        const dilutedScores: Record<string, number> = {};
        
        // Apply dilution factor to each score
        Object.keys(baseScores).forEach(key => {
            dilutedScores[key] = baseScores[key] * dilutionFactor;
        });
        
        return dilutedScores;
    }

    function calculateScoreDifferences() {
        const differences: Record<string, { 
            teamValue: number;
            opponentValue: number;
            difference: number;
            percentage: number;
            winner: 'team' | 'opponent' | 'tie' 
        }> = {};
        
        // Get all score keys from teamScores
        Object.keys(teamScores).forEach(key => {
            const teamValue = teamScores[key] || 0;
            const opponentValue = opponentScores[key] || 0;
            const difference = teamValue - opponentValue;
            const maxPossible = Math.max(teamValue, opponentValue, 1);
            
            // Calculate percentage for bar width (0-50 scale from center)
            const percentage = Math.min((Math.abs(difference) / maxPossible) * 50, 50);
            
            differences[key] = {
                teamValue,
                opponentValue,
                difference,
                percentage,
                winner: difference > 0 ? 'team' : difference < 0 ? 'opponent' : 'tie'
            };
        });
        
        return differences;
    }

    // Score labels and colors - adjusted for group scores
    const scoreConfig: Record<string, { label: string; color: string }> = {
        finishing: { label: 'Finishing', color: '#ef4444' },
        attacking: { label: 'Attacking', color: '#8b5cf6' },
        possession: { label: 'Possession', color: '#ec4899' },
        passing: { label: 'Passing', color: '#10b981' },
        defense: { label: 'Defense', color: '#14b8a6' },
        keeping: { label: 'Keeping', color: '#f59e0b' },
    };

    // Format group name for display
    function formatGroupName(group: string): string {
        const formatted = group.charAt(0).toUpperCase() + group.slice(1);
        return formatted === 'Keepers' ? 'Goalkeeper' : formatted;
    }
</script>

<div class="positional-display-container">
    <!-- Group Header -->
    <h1 class="group-title">{formatGroupName(group)}</h1>
    
    {#if hasPlayers}
        <!-- Players Display -->
        <div class="players-section">
            <!-- Team Players (Left) -->
            {#if teamPlayers.length > 0}
                <div class="team-side">
                    <div class="players-grid">
                        {#each teamPlayers as player}
                            <div class="player-card">
                                <img 
                                    src={player.image_path} 
                                    alt={player.player_name}
                                    class="player-image"
                                />
                                <p class="player-name">{playerLastName(player.player_name)}</p>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Opponent Players (Right) -->
            {#if opponentPlayers.length > 0}
                <div class="opponent-side">
                    <div class="players-grid">
                        {#each opponentPlayers as player}
                            <div class="player-card">
                                <img 
                                    src={player.image_path} 
                                    alt={player.player_name}
                                    class="player-image"
                                />
                                <p class="player-name">{playerLastName(player.player_name)}</p>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        {#if hasBothTeams}
            <!-- Comparison chart for both teams -->
            <div class="comparison-chart">
                <div class="chart-header">
                    <span class="team-label">{team.name}</span>
                    <span class="opponent-label">{opponentTeam.name}</span>
                </div>
                
                <div class="comparison-bars">
                    {#each Object.entries(scoreDifferences) as [key, data]}
                        {#if scoreConfig[key]}
                            <div class="comparison-row">
                                <span class="metric-label">{scoreConfig[key].label}</span>
                                
                                <div class="bar-container">
                                    <!-- Team side score -->
                                    <div class="team-score">
                                        {Math.round(data.teamValue)}
                                    </div>
                                    
                                    <!-- Horizontal bar wrapper -->
                                    <div class="horizontal-bar-wrapper">
                                        <div class="horizontal-bar-background"></div>
                                        <div class="center-line"></div>
                                        
                                        {#if data.winner === 'team'}
                                            <!-- Bar extends to the left (team winning) -->
                                            <div 
                                                class="horizontal-bar team-winning"
                                                style="
                                                    left: {50 - data.percentage}%;
                                                    right: 50%;
                                                    background-color: #3b82f6;
                                                "
                                            ></div>
                                        {:else if data.winner === 'opponent'}
                                            <!-- Bar extends to the right (opponent winning) -->
                                            <div 
                                                class="horizontal-bar opponent-winning"
                                                style="
                                                    left: 50%;
                                                    right: {50 - data.percentage}%;
                                                    background-color: #ef4444;
                                                "
                                            ></div>
                                        {:else}
                                            <!-- Tie - just show center line -->
                                            <div 
                                                class="horizontal-bar tie"
                                                style="
                                                    left: 49.5%;
                                                    right: 49.5%;
                                                    background-color: #9ca3af;
                                                "
                                            ></div>
                                        {/if}
                                    </div>
                                    
                                    <!-- Opponent side score -->
                                    <div class="opponent-score">
                                        {Math.round(data.opponentValue)}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {:else if hasPlayers}
            <!-- Single team display -->
            <div class="single-team-stats">
                <h3 class="stats-title">
                    {teamPlayers.length > 0 ? team.name : opponentTeam.name} Stats
                </h3>
                <div class="stats-list">
                    {#each Object.entries(teamPlayers.length > 0 ? teamScores : opponentScores) as [key, value]}
                        {#if scoreConfig[key]}
                            <div class="stat-row">
                                <span class="stat-label">{scoreConfig[key].label}:</span>
                                <span class="stat-value" style="color: {scoreConfig[key].color}">
                                    {Math.round(value)}
                                </span>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
.positional-display-container {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    width: 34rem;
    max-height: 80rem;
    overflow-y: auto;
}

.group-title {
    text-align: center;
    font-size: 1.25rem;
    font-weight: bold;
    color: #1f2937;
    margin: 0;
}

.players-section {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
}

.team-side,
.opponent-side {
    flex: 1;
}

.players-grid {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
}

.player-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

.player-image {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #e5e7eb;
}

.player-name {
    font-size: 0.65rem;
    text-align: center;
    color: #4b5563;
    margin: 0;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Comparison Chart Styles */
.comparison-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 3rem;
    margin-bottom: 0.5rem;
}

.team-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3b82f6;
}

.opponent-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #ef4444;
}

.comparison-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.comparison-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.metric-label {
    font-size: 0.7rem;
    color: #4b5563;
    min-width: 60px;
    text-align: right;
}

.bar-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.team-score,
.opponent-score {
    font-size: 0.7rem;
    font-weight: 600;
    min-width: 30px;
    text-align: center;
}

.team-score {
    color: #3b82f6;
}

.opponent-score {
    color: #ef4444;
}

.horizontal-bar-wrapper {
    flex: 1;
    height: 20px;
    position: relative;
    display: flex;
    align-items: center;
}

.horizontal-bar-background {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
}

.center-line {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100%;
    background: #9ca3af;
    z-index: 1;
}

.horizontal-bar {
    position: absolute;
    height: 12px;
    border-radius: 6px;
    transition: all 0.3s ease;
    z-index: 2;
}

.horizontal-bar.team-winning {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.horizontal-bar.opponent-winning {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.horizontal-bar.tie {
    border-radius: 2px;
}

/* Single Team Stats Display */
.single-team-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
}

.stats-title {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
    margin-bottom: 0.5rem;
}

.stats-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 1rem;
}

.stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
}

.stat-value {
    font-size: 0.85rem;
    font-weight: 700;
}
</style>