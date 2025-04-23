<script>
  import { positionAbbrev } from "./utils/utils";
  import { getCountryUrl } from "./data/countryImages";

  let {
    player = {},
    currentPosition
  } = $props();
</script>

<div class="formation-player">
  {#if player}
    <div class="player-name">{player.player_name}</div>
    <img class="player-image" src={player.image_path} alt={player.player_name} />
  {:else}
    <div class="player-name">Empty</div>
    <div class="player-placeholder">No Player Selected</div>
    {/if}
  <div class="player-position">{currentPosition}</div>

   <!-- Hover popup -->
  {#if player}  
  {#if player.detailed_position !== "Goalkeeper"}
   <div class="player-popup">
    <div class="popup-upper-section">
        <div class="popup-info">
            <!-- <div><strong>{player.player_name}</strong></div> -->
            <!-- <div><strong>Nationality: </strong>   {player.nationality}</div> -->
            <div><strong>Position: </strong>   {positionAbbrev(player.detailed_position)}</div>
            <div><strong>Age: </strong>   {player.player_age} yrs</div>
        </div>
        <div class="nation-image">
            <img src={getCountryUrl(player.nationality)} alt={player.nationality} />
        </div>
    </div>
     <!-- Metrics bar graph -->
     <div class="player-metrics">
       <div class="metric">
         <span class="metric-label">Def. Score</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-def"
             style="width: {(player.defensive_score / 5000) * 100}%"
           ></div>
         </div>
       </div>

       <div class="metric">
         <span class="metric-label">Poss. Score</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-poss"
             style="width: {(player.possession_score / 5000 ) * 100}%"
           ></div>
         </div>
       </div>

       <div class="metric">
         <span class="metric-label">Pass. Score</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-pass"
             style="width: {(player.passing_score / 5000 ) * 100}%"
           ></div>
         </div>
       </div>

       <div class="metric">
         <span class="metric-label">Att. Score</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-attk"
             style="width: {(player.attacking_score / 5000 ) * 100}%"
           ></div>
         </div>
       </div>
     </div>
   </div>
   {:else if player.detailed_position === "Goalkeeper"}
   <div class="player-popup">
    <div class="popup-upper-section">
        <div class="popup-info">
            <div><strong>Position: </strong>   {positionAbbrev(player.detailed_position)}</div>
            <div><strong>Age: </strong>   {player.player_age} yrs</div>
        </div>
        <div class="nation-image">
            <img src={getCountryUrl(player.nationality)} alt={player.nationality} />
        </div>
    </div>
     <div class="metric">
       <span class="metric-label">Passing</span>
       <div class="metric-bar-container">
         <div
           class="metric-bar bar-pass"
           style="width: {(player.passing_score / 5000) * 100}%"
         ></div>
       </div>
     </div>
 
     <div class="metric">
       <span class="metric-label">Keeping</span>
       <div class="metric-bar-container">
         <div
           class="metric-bar bar-poss"
           style="width: {(player.keeper_score / 5000) * 100}%"
         ></div>
       </div>
     </div>
   </div>
   {/if}
   {/if} 
 </div>

<style>
  .formation-player {
    position: relative;
    background: rgb(255, 255, 255);
    border-radius: 12px;
    padding: 0.75rem;
    width: 120px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    font-size: 0.8rem;
    cursor: default;
    transition: transform 0.1s ease;
  }
  .formation-player:hover {
    transform: translateY(-4px);
  }


  .player-name {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .player-image {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 0.5rem;
    border: 2px solid #ccc;
  }

  .player-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-bottom: 0.5rem;
    border: 2px dashed #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #999;
  }

  .player-position {
    font-size: 0.75rem;
    color: #333;
    margin-bottom: 0.5rem;
  }

  /* Popup styling positioned above-right (northeast) */
  .player-popup {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 100%;
    width: 12rem;
    margin-bottom: 0.5rem;
    margin-left: 0.5rem;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    text-align: left;
    white-space: nowrap;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .formation-player:hover .player-popup {
    display: block;
    opacity: 1;
  }

  .popup-upper-section {
    position: relative;    /* make this the containing block */
    display: flex;
    align-items: center;
  }

  .nation-image {
    width: 2rem;
    height: 2rem;
    border-radius: 25%;
    overflow: hidden;
    border: 0.01rem solid #a0a0a091;
    flex-shrink: 0;
    position: absolute;    
    right: 0.75rem;        
    top: 50%;              
    transform: translateY(-50%);
    margin-left: 0; 
  }

  .nation-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;      /* fill the circle cleanly */
    display: block;
  }

  /* Metrics bar chart styles */
  .player-metrics {
    margin-top: 0.5rem;
  }
  .metric {
    display: flex;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  .metric-label {
    flex: 0 0 5.5rem;
    font-size: 0.7rem;
    color: #333;
  }
  .metric-bar-container {
    flex: 1;
    height: 0.5rem;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
  }
  .metric-bar {
    height: 100%;
  }
  .bar-def {
    background-color: #e74c3c;
  }
  .bar-poss {
    background-color: #3498db;
  }
  .bar-pass {
    background-color: #2ecc71;
  }
  .bar-attk {
    background-color: #f1c40f;
  }
</style>