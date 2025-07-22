<script>
  import { positionAbbrev } from "./utils";
  import { getCountryUrl } from "./data/countryImages";
  import { getFallbackPos } from "./data/fallbackOrder";
  import { recalculateSectionScores } from "./utils";
  import PlayerMini from "./PlayerMini.svelte";
  import { playerTeam } from "$lib/stores/teams.svelte";
  import { onMount } from "svelte";

  let {
    player = {},
    currentPosition
  } = $props();

  let currentSlot = $state({})
  let eligiblePositions = $state([])
  let eligibleReplacements = $state([])
  let showDropdown = $state(false)
  let selectedReplacement = $state('')
  let dropdownTimeout = null;
  let fadeTimeout = null;
  let dropdownFading = $state(false);

  const positionGroups = ['attackers', 'midfielders', 'defenders', 'keepers'];

  onMount(()=> {
    if(player && player.id){
      currentSlot = getSelectedSlot()
      // console.log('currSlot', currentSlot)
      getEligiblePositions()
      // console.log('eliggg', eligiblePositions, 'curr: ', currentPosition)
      getEligiblePlayers()
      // console.log('eligREP: ', eligibleReplacements, 'position: ', currentPosition)
      console.log('selekta: ', playerTeam.selected)
    }
  })

  function getSelectedSlot(){
    if (player.id){
      for (const group of positionGroups) {
        const detailedPositions = Object.keys(playerTeam.selected[group]);
        for (const detailedPos of detailedPositions) {
          if(playerTeam.selected[group][detailedPos] && playerTeam.selected[group][detailedPos].players){
            const playersArray = playerTeam.selected[group][detailedPos].players;
            for (let i = 0; i < playersArray.length; i++){
              if (playersArray[i].id === player.id) {
                const data = {
                  positionGroup: group,
                  detailedPosition: detailedPos,
                  playerIndex: i,
                  path: ['selected', group, detailedPos, 'players', i],
                  player: playersArray[i]
                }
                console.log(data)
                return data;
              }
            }
          }
        }
      }
    }
  }

  function getEligiblePositions(){
    console.log(player.player_name)
    eligiblePositions.push(currentPosition)
    if (currentPosition !== 'Goalkeeper'){
      const fallbacks = getFallbackPos(currentPosition)
      eligiblePositions.push(...fallbacks)
    }
  }

  function getEligiblePlayers(){
    if(eligiblePositions && eligiblePositions.length > 0){
      eligiblePositions.forEach(pos => {
        scanPlayersForPos(pos)
      })
    }
  }

  function scanPlayersForPos(position){
    for (const group of positionGroups) {
      if (playerTeam[group] && playerTeam[group].length > 0){
        for(let i = 0; i < playerTeam[group].length; i++) {
          if(playerTeam[group][i].detailed_position && playerTeam[group][i].detailed_position === position) {
            if (playerTeam[group][i].player_name !== player.player_name){
              eligibleReplacements.push(playerTeam[group][i])
            }
          }
        }
      }
    }
  }

  function findReplacementSlot(replacementPlayer) {
    for (const group of positionGroups) {
      const detailedPositions = Object.keys(playerTeam.selected[group]);
      for (const detailedPos of detailedPositions) {
        if(playerTeam.selected[group][detailedPos] && playerTeam.selected[group][detailedPos].players){
          const playersArray = playerTeam.selected[group][detailedPos].players;
          for (let i = 0; i < playersArray.length; i++){
            if (playersArray[i].id === replacementPlayer.id) {
              return {
                positionGroup: group,
                detailedPosition: detailedPos,
                playerIndex: i,
                player: playersArray[i]
              };
            }
          }
        }
      }
    }
    return null;
  }

  function replacePlayer(replacementPlayer) {
    if (currentSlot && currentSlot.path && replacementPlayer) {
      // Find the replacement player's current slot
      const replacementSlot = findReplacementSlot(replacementPlayer);
      
      if (replacementSlot) {
        // Get the current players
        const currentPlayer = playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex];
        const swapPlayer = playerTeam.selected[replacementSlot.positionGroup][replacementSlot.detailedPosition].players[replacementSlot.playerIndex];
        
        // Perform the swap
        playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex] = swapPlayer;
        playerTeam.selected[replacementSlot.positionGroup][replacementSlot.detailedPosition].players[replacementSlot.playerIndex] = currentPlayer;
        
        // Update local state to reflect the change
        player = replacementPlayer;
        currentSlot.player = replacementPlayer;
        
        console.log(`Players swapped: ${currentPlayer.player_name} <-> ${replacementPlayer.player_name}`);
 
        recalculateSectionScores(playerTeam)

        // Dispatch event to trigger re-render
        import.meta.env.SSR || document.dispatchEvent(new CustomEvent('playerSwapped'));
      }
      
      // Reset dropdown
      showDropdown = false;
      selectedReplacement = '';
    }
  }

  function handleDropdownMouseEnter() {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      dropdownTimeout = null;
    }
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
    dropdownFading = false;
  }

  function handleDropdownMouseLeave() {
    dropdownTimeout = setTimeout(() => {
      dropdownFading = true;
      fadeTimeout = setTimeout(() => {
        showDropdown = false;
        dropdownFading = false;
      }, 200); // Match the CSS transition duration
    }, 1000);
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown && dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      dropdownTimeout = null;
    }
  }

  // Cleanup on component destroy
  $effect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  });
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

  <!-- Replacement Dropdown -->
  {#if eligibleReplacements.length > 0}
    <div 
        class="replacement-dropdown-container"
        onmouseenter={handleDropdownMouseEnter}
        onmouseleave={handleDropdownMouseLeave}
        role="list"
        aria-label="Swap players dropdown"
      >
      <!-- Remove Player Button (X) -->
      <button 
        class="remove-player-btn" 
        onclick={() => console.log('Remove player - TODO')}
        aria-label="Remove player"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      
      <!-- Swap Players Dropdown -->
      {#if showDropdown}
        <div 
          class="replacement-dropdown"
          class:fade-out={dropdownFading}
          role="menu"
          tabindex="0"
          onmouseenter={handleDropdownMouseEnter}
          onmouseleave={handleDropdownMouseLeave}  
          aria-label="Swap players dropdown"
        >
          {#each eligibleReplacements as replacement}
            <button 
              class="replacement-option"
              onclick={() => replacePlayer(replacement)}
              role="menuitem"
              aria-label="Replace player with {replacement.player_name}"
            >
              <PlayerMini player={replacement} showPopup={false} />
              <span class="player-name-option">{replacement.player_name}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Dropdown Toggle Button -->
    <button 
      class="dropdown-toggle" 
      onclick={toggleDropdown}
      onmouseenter={handleDropdownMouseEnter}
      onmouseleave={handleDropdownMouseLeave}
      aria-label="Swap players"
    >
      Swap Player
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
  {/if}

  <!-- Hover popup -->
  {#if player}  
  {#if player.detailed_position !== "Goalkeeper"}
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

  /* Replacement Dropdown Styles */
  .replacement-dropdown-container {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    z-index: 20;
  }

  .remove-player-btn {
    background: rgba(220, 38, 38, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0;
  }

  .formation-player:hover .remove-player-btn {
    opacity: 1;
  }

  .remove-player-btn:hover {
    background: rgba(220, 38, 38, 1);
    transform: scale(1.1);
  }

  .dropdown-toggle {
    position: absolute;
    bottom: -0.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0;
    white-space: nowrap;
  }

  .formation-player:hover .dropdown-toggle {
    opacity: 1;
  }

  .dropdown-toggle:hover {
    background: #1d4ed8;
  }

  .replacement-dropdown {
    position: absolute;
    top: calc(100% + 2.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    padding: 0.5rem;
    min-width: 220px;
    max-height: 300px;
    overflow-y: auto;
    opacity: 1;
    transition: opacity 0.2s ease-out;
  }
  
  .replacement-dropdown.fade-out {
    opacity: 0;
    pointer-events: none;
  }

  .replacement-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
  }

  .replacement-option:hover {
    background-color: #f3f4f6;
  }

  .player-name-option {
    font-size: 0.85rem;
    font-weight: 500;
    color: #333;
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
    position: relative;
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
    object-fit: cover;
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