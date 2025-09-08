<script lang="ts">
    import type { Player } from "./types/types";

    let {
        fieldPosition = '',
        zone = 0,
        teamPlayers = [],
        opponentPlayers = [],
        mode = 0,
    } = $props<{
        fieldPosition: string;
        zone: number;
        teamPlayers: Player[];
        opponentPlayers: Player[];
        mode: number;
    }>();

    // Determine which scores to display based on position
    const isGoalkeeper = $derived(fieldPosition === 'Goalkeeper');
    
    // Calculate aggregated scores for each team
    const teamScores = $derived(calculateTeamScores(teamPlayers));
    const opponentScores = $derived(calculateTeamScores(opponentPlayers));
    
    // Get maximum value for scaling bar charts
    const maxScore = $derived(Math.max(
        ...Object.values(teamScores),
        ...Object.values(opponentScores)
    ));

    function calculateTeamScores(players: Player[]) {
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

            return scores;
        }
    }

    function getBarHeight(value: number): number {
        if (maxScore === 0) return 0;
        return (value / maxScore) * 100;
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
    
    <!-- Players Display -->
    <div class="players-section">
        <!-- Team Players (Left) -->
        <div class="team-side">
            <div class="players-grid">
                {#each teamPlayers as player}
                    <div class="player-card">
                        <img 
                            src={player.image_path} 
                            alt={player.player_name}
                            class="player-image"
                        />
                        <p class="player-name">{player.player_name}</p>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Opponent Players (Right) -->
        <div class="opponent-side">
            <div class="players-grid">
                {#each opponentPlayers as player}
                    <div class="player-card">
                        <img 
                            src={player.image_path} 
                            alt={player.player_name}
                            class="player-image"
                        />
                        <p class="player-name">{player.player_name}</p>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Score Comparison -->
    <div class="score-comparison">
        <!-- Team Bar Chart -->
        <div class="chart-container">
            <h3 class="chart-title">Team</h3>
            <div class="bars-wrapper">
                {#each Object.entries(teamScores) as [key, value]}
                    <div class="bar-group">
                        <div class="bar-column">
                            <div 
                                class="bar"
                                style="height: {getBarHeight(value)}%; background-color: {scoreConfig[key].color};"
                            >
                                <span class="bar-value">{Math.round(value)}</span>
                            </div>
                        </div>
                        <span class="bar-label">{scoreConfig[key].label}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Opponent Bar Chart -->
        <div class="chart-container">
            <h3 class="chart-title">Opponent</h3>
            <div class="bars-wrapper">
                {#each Object.entries(opponentScores) as [key, value]}
                    <div class="bar-group">
                        <div class="bar-column">
                            <div 
                                class="bar"
                                style="height: {getBarHeight(value)}%; background-color: {scoreConfig[key].color};"
                            >
                                <span class="bar-value">{Math.round(value)}</span>
                            </div>
                        </div>
                        <span class="bar-label">{scoreConfig[key].label}</span>
                    </div>
                {/each}
            </div>
        </div>
    </div>
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
    width: 35rem;
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

.score-comparison {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.chart-title {
    text-align: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
}

.bars-wrapper {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 120px;
    padding: 0.3rem;
    background: #f9fafb;
    border-radius: 0.375rem;
}

.bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    flex: 1;
}

.bar-column {
    height: 100px;
    display: flex;
    align-items: flex-end;
    width: 100%;
}

.bar {
    width: 20px;
    margin: 0 auto;
    border-radius: 0.15rem 0.15rem 0 0;
    transition: height 0.3s ease;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.1rem;
}

.bar-value {
    color: white;
    font-size: 0.5rem;
    font-weight: 600;
}

.bar-label {
    font-size: 0.5rem;
    color: #6b7280;
    text-align: center;
    line-height: 1;
}
</style>