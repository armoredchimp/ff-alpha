<script lang="ts">
    import type { Player } from "./types/types";
    import { playerLastName } from "./utils/common";

    let {
        fieldPosition = '',
        zone = 0,
        teamPlayers = [],
        opponentPlayers = [],
        mode = 0,
        teamName = '',
        opponentName = ''
    } = $props<{
        fieldPosition: string;
        zone: number;
        teamPlayers: Player[];
        opponentPlayers: Player[];
        mode: number;
        teamName: string;
        opponentName: string
    }>();

    // Determine which scores to display based on position
    const isGoalkeeper = $derived(fieldPosition === 'Goalkeeper');
    
    // Check if we have players
    const hasPlayers = $derived(teamPlayers.length > 0 || opponentPlayers.length > 0);
    const hasBothTeams = $derived(teamPlayers.length > 0 && opponentPlayers.length > 0);
    
    // Calculate aggregated scores for each team
    const teamScores = $derived(calculateTeamScores(teamPlayers));
    const opponentScores = $derived(calculateTeamScores(opponentPlayers));
    
    // Get maximum value for scaling bar charts
    const maxScore = $derived(Math.max(
        ...Object.values(teamScores),
        ...Object.values(opponentScores)
    ));

    // Calculate score differences for horizontal bars
    const scoreDifferences = $derived(calculateScoreDifferences());

    function calculateTeamScores(players: Player[]) {
        // Calculate dilution factor based on number of players
        const dilutionFactor = players.length === 2 ? 0.9 : players.length >= 3 ? 0.8 : 1;
        
        if (isGoalkeeper) {
            const scores = {
                total: 0,
                passing: 0,
                keeper: 0,
            };

            players.forEach(player => {
                scores.total += player.total_score || 0;
                scores.passing += player.passing_score || 0;
                scores.keeper += player.keeper_score || 0;
            });

            // Apply dilution factor
            scores.total *= dilutionFactor;
            scores.passing *= dilutionFactor;
            scores.keeper *= dilutionFactor;

            return scores;
        } else {
            const scores = {
                total: 0,
                passing: 0,
                finishing: 0,
                attacking: 0,
                possession: 0,
                defensive: 0,
            };

            players.forEach(player => {
                scores.total += player.total_score || 0;
                scores.passing += player.passing_score || 0;
                scores.finishing += player.finishing_score || 0;
                scores.attacking += player.attacking_score || 0;
                scores.possession += player.possession_score || 0;
                scores.defensive += player.defensive_score || 0;
            });

            // Apply dilution factor
            scores.total *= dilutionFactor;
            scores.passing *= dilutionFactor;
            scores.finishing *= dilutionFactor;
            scores.attacking *= dilutionFactor;
            scores.possession *= dilutionFactor;
            scores.defensive *= dilutionFactor;

            return scores;
        }
    }

    function getBarHeight(value: number): number {
        if (maxScore === 0) return 0;
        return (value / maxScore) * 100;
    }

    function calculateScoreDifferences() {
        const differences: Record<string, { 
            teamValue: number;
            opponentValue: number;
            difference: number;
            percentage: number;
            winner: 'team' | 'opponent' | 'tie' 
        }> = {};
        
        Object.keys(teamScores).forEach(key => {
            const teamValue = teamScores[key as keyof typeof teamScores];
            const opponentValue = opponentScores[key as keyof typeof opponentScores];
            const difference = teamValue - opponentValue;
            const maxDiff = Math.max(Math.abs(difference), 1); // Avoid division by zero
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

    // Score labels and colors
    const scoreConfig = {
        total: { label: 'Total', color: '#3b82f6' },
        passing: { label: 'Passing', color: '#10b981' },
        keeper: { label: 'Keeper', color: '#f59e0b' },
        finishing: { label: 'Finishing', color: '#ef4444' },
        attacking: { label: 'Attacking', color: '#8b5cf6' },
        possession: { label: 'Possession', color: '#ec4899' },
        defensive: { label: 'Defensive', color: '#14b8a6' },
    };
</script>

<div class="zone-display-container">
    <!-- Position Header -->
    <h1 class="position-title">{mode === 0 ? fieldPosition : `Zone ${zone}`}</h1>
    
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
            <!-- Only show comparison chart when both teams present -->
            <div class="comparison-chart">
                <div class="chart-header">
                    <span class="team-label">{teamName}</span>
                    <span class="opponent-label">{opponentName}</span>
                </div>
                
                <div class="comparison-bars">
                    {#each Object.entries(scoreDifferences) as [key, data]}
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
                    {/each}
                </div>
            </div>
        {:else if hasPlayers}
            <!-- Single team bar chart - compact version -->
            <div class="single-team-chart">
                <h3 class="chart-title">
                    {teamPlayers.length > 0 ? teamName : opponentName}
                </h3>
                <div class="compact-bars-wrapper">
                    {#each Object.entries(teamPlayers.length > 0 ? teamScores : opponentScores) as [key, value]}
                        <div class="compact-bar-group">
                            <div class="compact-bar-column">
                                <div 
                                    class="compact-bar"
                                    style="height: {getBarHeight(value)}%; background-color: {scoreConfig[key].color};"
                                >
                                    <span class="compact-bar-value">{Math.round(value)}</span>
                                </div>
                            </div>
                            <span class="compact-bar-label">{scoreConfig[key].label}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
.zone-display-container {
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

.position-title {
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

/* Single Team Compact Bar Chart */
.single-team-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.chart-title {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
}

.compact-bars-wrapper {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 0.75rem;
    height: 140px;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
}

.compact-bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
}

.compact-bar-column {
    height: 120px;
    display: flex;
    align-items: flex-end;
}

.compact-bar {
    width: 45px;
    border-radius: 0.25rem 0.25rem 0 0;
    transition: height 0.3s ease;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.25rem;
}

.compact-bar-value {
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
}

.compact-bar-label {
    font-size: 0.6rem;
    color: #6b7280;
    text-align: center;
    line-height: 1;
    max-width: 45px;
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
</style>