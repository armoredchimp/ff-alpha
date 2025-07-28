<script>
    import ManagerMini from "./ManagerMini.svelte";
    import { teams, playerTeam } from "$lib/stores/teams.svelte";

    let {
      team = {
          name: '',
          draftOrder: 0,
          attackers: [],
          midfielders: [],
          defenders: [],
          keepers: [],
          playerCount: 0,
          traits: [],
          transferBudget: 0,
          manager: null,
          rivals: []
      },
      computer = false
    } = $props();

    let hoveredRival = $state(null);
    let popupPosition = $state({ x: 0, y: 0 });

    function getRivalTeam(index) {
        if (index === 0) return playerTeam;
        const teamKey = `team${index}`;
        return teams[teamKey] || null;
    }

    function handleRivalHover(event, rival) {
        hoveredRival = rival;
        const rect = event.currentTarget.getBoundingClientRect();
        popupPosition = {
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8
        };
    }

    function handleRivalLeave() {
        hoveredRival = null;
    }

    // Calculate bar width percentage
    function getBarWidth(value, max = 5000) {
        const percentage = (value / max) * 100;
        return `${Math.min(100, percentage)}%`;
    }
</script>

<div class="header-container">
    <div class="header-content">
        <div class="flex flex-col space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="team-name">{team.name}</h1>
                    <div class="stats-container">
                        <span class="stat-item">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Draft #{team.draftOrder}
                        </span>
                        <span class="stat-item">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {team.playerCount} Players
                        </span>
                    </div>
                </div>

                {#if computer && team.manager}
                    <div class="manager-container">
                        <img 
                            src={team.manager.image_path} 
                            alt={team.manager.display_name} 
                            class="manager-photo" 
                        />
                        <div class="manager-info">
                            <p class="manager-label">Manager</p>
                            <p class="manager-name">{team.manager.display_name}</p>
                        </div>
                    </div>
                {/if}
            </div>

            {#if computer && team.traits.length > 0}
                <div class="traits-container">
                    {#each team.traits as trait}
                        <span class="trait-badge">{trait}</span>
                    {/each}
                </div>
            {/if}
            
            {#if team.rivals.length > 0}
                <div class="rivals-container">
                    {#each team.rivals as rival}
                        {@const rivalTeam = getRivalTeam(rival.index)}
                        <a 
                            href="{rival.index === 0 ? '/teams/player/main' : `/teams/${rivalTeam?.name?.toLowerCase()}`}"
                            class="rival-badge"
                            onmouseenter={(e) => handleRivalHover(e, rival)}
                            onmouseleave={handleRivalLeave}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="rival-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span class="rival-name">{rival.name}</span>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Rival Popup -->
{#if hoveredRival}
    {@const rivalTeam = getRivalTeam(hoveredRival.index)}
    {#if rivalTeam}
        <div 
            class="rival-popup"
            style="left: {popupPosition.x}px; top: {popupPosition.y}px;"
        >
            <div class="popup-header">
                <h4 class="popup-title">{rivalTeam.name}</h4>
            </div>
            
            {#if rivalTeam.traits && rivalTeam.traits.length > 0}
                <div class="popup-traits">
                    {#each rivalTeam.traits as trait}
                        <span class="popup-trait">{trait}</span>
                    {/each}
                </div>
            {/if}

            <div class="popup-stats">
                <div class="stat-row">
                    <span class="stat-label">Wins:</span>
                    <span class="stat-value">{rivalTeam.wins}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Draws:</span>
                    <span class="stat-value">{rivalTeam.draws}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Losses:</span>
                    <span class="stat-value">{rivalTeam.losses}</span>
                </div>
            </div>

            <div class="popup-scores">
                <h5 class="scores-title">Team Ratings</h5>
                <div class="scores-list">
                    {#each [
                        { label: 'ATK', value: rivalTeam.scores.total.attacking / rivalTeam.playerCount, color: '#fca5a5' },
                        { label: 'PAS', value: rivalTeam.scores.total.passing / rivalTeam.playerCount, color: '#93c5fd' },
                        { label: 'POS', value: rivalTeam.scores.total.possession / rivalTeam.playerCount, color: '#6ee7b7' },
                        { label: 'DEF', value: rivalTeam.scores.total.defense / rivalTeam.playerCount, color: '#fde68a' },
                        { label: 'KEP', value: rivalTeam.scores.total.keeping / (rivalTeam.keepers?.length || 1), color: '#a074cf' }
                    ] as stat}
                        <div class="score-row">
                            <span class="score-label">{stat.label}</span>
                            <div class="score-bar-container">
                                <div 
                                    class="score-bar"
                                    style="width: {getBarWidth(stat.value)}; background-color: {stat.color};"
                                ></div>
                            </div>
                            <span class="score-number">{Math.round(stat.value)}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
{/if}

<style>
    .header-container {
        width: 100%;
        padding: 2rem 1.5rem;
        background-color: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        border-bottom: 1px solid #f3f4f6;
    }

    .header-content {
        max-width: 80rem;
        margin: 0 auto;
    }

    .team-name {
        font-size: 1.875rem;
        font-weight: 700;
        line-height: 2.25rem;
        color: #111827;
        letter-spacing: -0.025em;
    }

    .stats-container {
        display: flex;
        gap: 1.5rem;
        margin-top: 0.75rem;
        font-size: 1.125rem;
        color: #4b5563;
    }

    .stat-item {
        display: flex;
        align-items: center;
    }

    .stat-icon {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.375rem;
    }

    .manager-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .manager-photo {
        width: 4.5rem;
        height: 4.5rem;
        border-radius: 9999px;
        object-fit: cover;
        border: 2px solid #e5e7eb;
    }

    .manager-info {
        display: flex;
        flex-direction: column;
    }

    .manager-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
    }

    .manager-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
    }

    .traits-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding-top: 0.5rem;
    }

    .trait-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        background-color: #e0e7ff;
        color: #4338ca;
    }

    /* Rivals styling */
    .rivals-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 0.75rem;
    }

    a.rival-badge {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.875rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        background-color: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        transition: all 0.2s ease;
        cursor: pointer;
        text-decoration: none;
    }

    a.rival-badge:hover {
        background-color: #fee2e2;
        border-color: #fca5a5;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15);
    }

    .rival-icon {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
    }

    .rival-name {
        line-height: 1;
    }

    /* Popup styling */
    .rival-popup {
        position: fixed;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
        padding: 1rem;
        z-index: 1000;
        min-width: 280px;
        max-width: 320px;
        transform: translateX(-50%);
        pointer-events: none;
    }

    .popup-header {
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #f3f4f6;
    }

    .popup-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
    }

    .popup-traits {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-bottom: 0.75rem;
    }

    .popup-trait {
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        background-color: #f3f4f6;
        color: #6b7280;
    }

    .popup-stats {
        margin-bottom: 0.75rem;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
    }

    .stat-label {
        color: #6b7280;
    }

    .stat-value {
        font-weight: 600;
        color: #1f2937;
    }

    .popup-scores {
        margin-top: 0.75rem;
    }

    .scores-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
    }

    .scores-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .score-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
    }

    .score-label {
        width: 2rem;
        font-weight: 600;
        color: #6b7280;
    }

    .score-bar-container {
        flex: 1;
        height: 6px;
        background: #f3f4f6;
        border-radius: 3px;
        overflow: hidden;
    }

    .score-bar {
        height: 100%;
        transition: width 0.3s ease;
    }

    .score-number {
        width: 2.5rem;
        text-align: right;
        font-weight: 600;
        color: #374151;
    }
</style>