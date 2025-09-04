<script lang="ts">
    import { getCountryUrl } from "./data/countryImages";
    import type { Player } from "$lib/types/types";
    let {
        player = null as Player | null,
        showPopup = true,
        borderCode = 0
    } = $props<{
        player?: Player | null;
        showPopup?: boolean;
        borderCode?: number
    }>();
    let nationImage = $state<string | null>(null)
 
    if(player && player.nationality){
        nationImage = getCountryUrl(player.nationality)
    }
</script>
<div class="player-image-container">
    <img 
        src={nationImage} 
        alt={player?.player_name || 'Player'} 
        class="player-photo"
        class:border-blue={borderCode === 1}
        class:border-red={borderCode === 2}
    />
    {#if showPopup && player}
        <div class="player-popup">
            <h5>{player.player_name}</h5>
            <p>Position: {player.detailed_position}</p>
            <p>Age: {player.player_age}</p>
            <p>Nationality: {player.nationality}</p>
        </div>
    {/if}
</div>
<style>
    .player-image-container {
        position: relative;
        width: 35px;
        height: 35px;
    }
   
    .player-photo {
        width: 100%;
        height: 100%;
        border-radius: 25px;
        object-fit: cover;
        box-sizing: border-box;
    }

    .player-photo.border-blue {
        border: 0.25rem solid #60a5fab2;
    }

    .player-photo.border-red {
        border: 0.25rem solid #c04b4bb0;
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
</style>