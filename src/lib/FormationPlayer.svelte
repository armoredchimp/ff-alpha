<script>
    // Export component properties with default values.
    export let player = null;
    export let currentPosition = '';
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
    <!-- <select class="player-select">
      <option disabled selected>Select replacement</option>
    </select> -->
  </div>
  
  <style>
    .formation-player {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 0.75rem;
      width: 120px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 0.8rem;
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
    
    /* Placeholder styling for when no player is assigned */
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
    
    .player-select {
      width: 100%;
      padding: 0.25rem;
      font-size: 0.7rem;
    }
  </style>
  