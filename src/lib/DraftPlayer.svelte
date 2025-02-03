<script>
    let {
        player = {
            id: 0,
            name: '',
            team_name: '',
            date_of_birth: 0,
            nationality: '',
            image_path: ''
        }
    } = $props()

    let isExpanded = $state(false);

    function toggleExpand() {
        isExpanded = !isExpanded;
    }

    function calculateAge(date_of_birth) {
        const dob = new Date(date_of_birth);
        
        const today = new Date();
        
        let age = today.getFullYear() - dob.getFullYear();
        
        const monthDifference = today.getMonth() - dob.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        return age;
}
</script>

<div 
    role="button"
    tabindex="0"
    class="player-card" 
    class:expanded={isExpanded}
    onclick={toggleExpand}
    onkeydown={e => e.key === 'Enter' && toggleExpand()}
    aria-expanded={isExpanded}
    aria-label={`Player card for ${player.name}`}
>
<div class="info">
    <div class="name-value">
        <h3>{player.name}</h3>
        
    </div>
    <div class="details">
        <span>{calculateAge(player.date_of_birth)} yrs</span>
        <span></span>
        <span>{player.team_name}</span>
    </div>

    {#if isExpanded}
        <div class="expanded-content">
            <div class="photo-section">
                {#if player.image_path}
                    <img src={player.image_path} alt={player.name} class="player-photo" />
                {/if}
            </div>
            <div class="expanded-info">
                <span>Expanded Content</span>

            </div>
        </div>
    {/if}
</div>
</div>

<style>
     .player-card {
        width: 100%;
        text-align: left;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .player-card:hover {
        background-color: #f8fafc;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .player-card.expanded {
        background-color: #f8fafc;
        padding: 1rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .name-value {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }

    h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .details {
        display: flex;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #64748b;
        flex-wrap: wrap;
    }

    span {
        white-space: nowrap;
    }

    .expanded-content {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 1.5rem;
    }

    .photo-section {
        flex-shrink: 0;
    }

    .player-photo {
        width: 120px;
        height: 120px;
        border-radius: 60px;
        object-fit: cover;
    }

    .expanded-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>