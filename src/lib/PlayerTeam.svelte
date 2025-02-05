<script>
    let {
        team = {
            name: '',
            draftOrder: 0,
            attackers: [],
            midfielders: [],
            defenders: [],
            keepers: [],
            playerCount: 0,
            transferBudget: 0
        }
    } = $props();
</script>

<div class="player-team-card">
    <div class="team-header">
        <h3>{team.name}</h3>
        <h4>Draft Position: {team.draftOrder}</h4>
        <h4>Transfer Budget: £{team.transferBudget.toFixed(2)}M</h4>
    </div>
    <div class="content">
        <div class="stat-row">
            <span class="label">Total Players:</span>
            <span class="value">{team.playerCount}</span>
        </div>
        <div class="position-group">
            <span class="label">Attackers:</span>
            <div class="player-images">
                {#each team.attackers as [player, statistics]}
                    <div class="player-image-container">
                        <img src={player.photo} alt={player.name} class="player-photo" />
                        <div class="player-popup">
                            <h5>{player.name || `${player.firstname} ${player.lastname}`}</h5>
                            <p>Age: {player.age}</p>
                            <p>Nationality: {player.nationality}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
        <div class="position-group">
            <span class="label">Midfielders:</span>
            <div class="player-images">
                {#each team.midfielders as [player, statistics]}
                    <div class="player-image-container">
                        <img src={player.photo} alt={player.name} class="player-photo" />
                        <div class="player-popup">
                            <h5>{player.name || `${player.firstname} ${player.lastname}`}</h5>
                            <p>Age: {player.age}</p>
                            <p>Nationality: {player.nationality}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
        <div class="position-group">
            <span class="label">Defenders:</span>
            <div class="player-images">
                {#each team.defenders as [player, statistics]}
                    <div class="player-image-container">
                        <img src={player.photo} alt={player.name} class="player-photo" />
                        <div class="player-popup">
                            <h5>{player.name || `${player.firstname} ${player.lastname}`}</h5>
                            <p>Age: {player.age}</p>
                            <p>Nationality: {player.nationality}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
        <div class="position-group">
            <span class="label">Keepers:</span>
            <div class="player-images">
                {#each team.keepers as [player, statistics]}
                    <div class="player-image-container">
                        <img src={player.photo} alt={player.name} class="player-photo" />
                        <div class="player-popup">
                            <h5>{player.name || `${player.firstname} ${player.lastname}`}</h5>
                            <p>Age: {player.age}</p>
                            <p>Nationality: {player.nationality}</p>
                        </div>
                    </div>
                {/each}
            </div>
            <div class="view-team-container">
                <a
                    href="draft2/teams/player"
                    class="view-team-btn"
                    
                >
                    View Team
                </a>
            </div>
        </div>
    </div>
</div>

<style>
    .player-team-card {
        width: 100%;
        text-align: left;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 1.5rem;
        border-radius: 6px;
        background-color: #f8fafc;
        max-width: 400px;
    }

    .team-header {
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e2e8f0;
    }

    .content {
        margin-top: 1rem;
    }

    .stat-row, .position-group {
        display: flex;
        flex-direction: column;
        padding: 0.75rem 0;
    }

    .label {
        font-weight: 500;
        color: #4a5568;
        font-size: 1.1rem;
        margin-bottom: 0.5rem;
    }

    .player-images {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .player-image-container {
        position: relative;
        width: 50px;
        height: 50px;
    }

    .player-photo {
        width: 100%;
        height: 100%;
        border-radius: 25px;
        object-fit: cover;
    }

    .player-popup {
        display: none;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0.75rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        width: 200px;
        z-index: 10;
    }

    .player-image-container:hover .player-popup {
        display: block;
    }

    .player-popup h5 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .player-popup p {
        margin: 0.25rem 0;
        font-size: 0.8rem;
        color: #4a5568;
    }

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
    
    h3 {
        margin: 0;
        font-size: 1.5rem;
        color: #333;
        font-weight: bold;
    }

    h4 {
        margin: 0.5rem 0 0 0;
        font-size: 1.1rem;
        color: #666;
    }
</style>