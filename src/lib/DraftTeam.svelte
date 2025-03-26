<script>
   import PlayerMini from "./PlayerMini.svelte";
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
            rivals: [],
            transferBudget: 0, 
        }
    } = $props();
    let isExpanded = $state(false);
   
    function expanded() {
        isExpanded = !isExpanded;
    }
   
</script>

<button
    type="button"
    class="team-card"
    class:expanded={isExpanded}
    onclick={expanded}
    onkeydown={e => e.key === 'Enter' && expanded()}
    aria-expanded={isExpanded}
    aria-label={`Team card for ${team.name}`}
>
    <div class="team-header">
        <h3>{team.name}</h3>
        <h4>Draft Position: {team.draftOrder}</h4>
        <h4>Transfer Budget: £{team.transferBudget.toFixed(2)}M</h4>
    </div>
    {#if isExpanded}
        <div class="expanded-content">
            <div class="stat-row">
                <span class="label">Total Players:</span>
                <span class="value">{team.playerCount}</span>
            </div>
           
            <div class="position-group">
                <span class="label">Attackers:</span>
                <div class="player-images">
                    {#each team.attackers as [player, statistics]}
                        <PlayerMini {player} {statistics} />
                    {/each}
                </div>
            </div>

            <div class="position-group">
                <span class="label">Midfielders:</span>
                <div class="player-images">
                    {#each team.midfielders as [player, statistics]}
                        <PlayerMini {player} {statistics} />
                    {/each}
                </div>
            </div>

            <div class="position-group">
                <span class="label">Defenders:</span>
                <div class="player-images">
                    {#each team.defenders as [player, statistics]}
                        <PlayerMini {player} {statistics} />
                    {/each}
                </div>
            </div>

            <div class="position-group">
                <span class="label">Keepers:</span>
                <div class="player-images">
                    {#each team.keepers as [player, statistics]}
                        <PlayerMini {player} {statistics} />
                    {/each}
                </div>
            </div>
           
            <div class="traits-row">
                <span class="label">Club Traits:</span>
                <span class="value">
                    {#if team.traits.length === 0}
                        None
                    {:else}
                        {team.traits.join(', ')}
                    {/if}
                </span>
            </div>
           
            <div class="rivals-row">
                <span class="label">Club Rivals:</span>
                <span class="value">
                    {#if team.rivals.length === 0}
                        None
                    {:else}
                         {team.rivals.map(rival => rival.name).join(', ')}
                    {/if}
                </span>
            </div>
            <!-- <div class="view-team-container">
                <a
                    href="draft2/teams/{team.name.toLowerCase()}"
                    class="view-team-btn"
                    
                >
                    View Team
                </a>
            </div> -->
        </div>
    {/if}
</button>

<style>
    .view-team-container {
        margin-top: 1rem;
        text-align: center;
    }
    .view-team-btn {
        display: inline-block;
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        background-color: #64748b;
        color: white;
        border-radius: 4px;
        text-decoration: none;
        transition: background-color 0.2s;
    }
    .view-team-btn:hover {
        background-color: #475569;
    }
   
    .team-card {
        width: 300px;
        text-align: left;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
        appearance: none;
        -webkit-appearance: none;
        font: inherit;
    }
    .team-card:hover {
        background-color: #f8fafc;
    }
    .team-card.expanded {
        background-color: #f8fafc;
    }
    .team-header {
        margin-bottom: 0.5rem;
    }
    .expanded-content {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
    }
    .stat-row {
        display: flex;
        flex-direction: column;
        padding: 0.5rem 0;
    }
    .traits-row {
        border-top: 1px solid #e2e8f0;
        margin-top: 0.5rem;
        padding-top: 1rem;
    }
    h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #333;
    }
    h4 {
        margin: 0.25rem 0 0 0;
        font-size: 0.9rem;
        color: #666;
    }
    .label {
        font-weight: 500;
        color: #4a5568;
    }
    .value {
        color: #2d3748;
    }
    .position-group {
        display: flex;
        flex-direction: column;
        padding: 0.5rem 0;
    }
    .player-images {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
</style>