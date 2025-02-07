<script>
    import axios from "axios";
    let {
        player = {
            id: 0,
            name: '',
            team_name: '',
            date_of_birth: 0,
            nationality_id: '',
            nationality: '',
            nation_image: ''
        }
    } = $props()

    let isExpanded = $state(false);

    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded){
            getNation(player.nationality_id)
            getPlayerStats(player.id)
        }
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

    async function getPlayerStats(id) {
  const baseUrl = `/api/players/${id}`;
  const includeParam = `include=statistics.details.type`;
  const filtersParam = `filters=playerStatisticsSeasons:19735;playerStatisticDetailTypes:117`; // No URL encoding here!

  const url = `${baseUrl}?${includeParam}&${filtersParam}`; // Manual query string construction

  try {
    const response = await axios.get(url);
    console.log("Full URL:", url);
    console.log("Response Data:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching player stats:", error);
    console.error("Full URL (on error):", url);
    return null;
  }
}

    // async function getPlayerStats(id){
    //     try {
    //         const stats = await axios.get(`/api/players/${id}`,{
    //             params: {
    //                 include: 'statistics.details.type',
    //                 filter: 'playerStatisticsSeasons:23690;playerStatisticDetailTypes:117'
    //             }
    //         })
    //         console.log(stats.data)
    //     } catch(err){
    //         console.error(err)
    //     }
    // }

    async function getNation(id) {
        try {
            const nationRes = await axios.get(`/core/countries/${id}`);
            player.nation_image = nationRes.data.data.image_path
            return;
        } catch (err) {
            console.error(`Error fetching nation for country_id ${id}:`, err);
            return {
                image_path: ''
            }
        }
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
            <span>{player.nationality}</span>
            <span>{player.team_name}</span>
        </div>

        {#if isExpanded}
            <div class="expanded-content">
                <div class="image-section">
                    {#if player.image_path}
                        <img src={player.image_path} alt={player.name} class="player-photo" />
                    {/if}
                    {#if player.nation_image}
                        <img src={player.nation_image} alt={player.nationality} class="nation-image" />
                    {/if}
                </div>
                <div class="expanded-info">
                    <!-- Additional expanded info can go here -->
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
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .player-card:hover {
        background-color: #f8fafc;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .player-card.expanded {
        background-color: #f8fafc;
        padding: 1.5rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .name-value {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e293b;
    }

    .details {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
        color: #64748b;
    }

    .expanded-content {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .image-section {
        display: flex;
        gap: 1.5rem;
        align-items: center;
    }

    .player-photo {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #e2e8f0;
    }

    .nation-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid #e2e8f0;
    }

    .expanded-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>