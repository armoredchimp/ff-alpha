<script>
    import ManagerMini from "./ManagerMini.svelte";

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
          manager: null
      },
      computer = false
    } = $props();
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
        </div>
    </div>
</div>

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
</style>