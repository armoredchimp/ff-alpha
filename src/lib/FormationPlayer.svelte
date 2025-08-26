<script lang="ts">
  import { delay, positionAbbrev, formatPlayerName, recalculateSectionScores } from "./utils";
  import { getCountryUrl } from "./data/countryImages";
  import { getFallbackPos } from "./data/fallbackOrder";
  import PlayerMini from "./PlayerMini.svelte";
  import { playerTeam } from "$lib/stores/teams.svelte";
  import { onMount } from "svelte";
  import type { Player, Team } from "$lib/types/types";

  interface CurrentSlot {
    positionGroup?: string;
    detailedPosition?: string;
    playerIndex?: number;
    path?: string[];
    player?: Player | null;
  }

  interface ReplacementSlot {
    positionGroup?: string;
    detailedPosition?: string;
    playerIndex: number;
    player: Player | null;
    sub: boolean;
  }

  let {
    player = null as Player | null,
    currentPosition,
    zone = null as number | null,
    hide = false
  } = $props<{
    player?: Player | null;
    currentPosition: string;
    zone?: number | null;
    hide?: boolean;
  }>();

  let currentSlot = $state<CurrentSlot>({})
  let eligiblePositions = $state<string[]>([])
  let eligibleReplacements = $state<Player[]>([])
  let showDropdown = $state(false)
  let selectedReplacement = $state('')
  let dropdownTimeout: ReturnType<typeof setTimeout> | null = null;
  let nationImage = $state<string | null>(null)
  let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
  let dropdownFading = $state(false);
  let hoveredReplacement = $state<Player | null>(null);
  let showComparison = $state(false);
  const positionGroups = ['attackers', 'midfielders', 'defenders', 'keepers'];

  // Fixed: Better sub slot calculation that handles nulls properly
  let subSlot = $derived.by(() => {
    const subs = playerTeam.subs || [];
    
    // Find the first empty slot (null, undefined, or empty object)
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      if (!sub || typeof sub === 'number' || !('player_name' in sub) || !('id' in sub)) {
        return i;
      }
    }
    
    // If all slots are filled, return the length (next position)
    return subs.length;
  });

  onMount(() => {
    // Always get eligible positions based on currentPosition
    getEligiblePositions();
    // Always get eligible players, even if no player is selected
    getEligiblePlayers();
    
    // Only get current slot if there's a player
    if(player && player.id){
      currentSlot = getSelectedSlot();
      nationImage = getCountryUrl(player.nationality)
    }
  })

  function getSelectedSlot(): CurrentSlot {
    if (!player || !player.id) return {};
    
    for (const group of positionGroups) {
      if (!playerTeam.selected[group]) continue;
      
      const detailedPositions = Object.keys(playerTeam.selected[group]);
      for (const detailedPos of detailedPositions) {
        const positionData = playerTeam.selected[group][detailedPos];
        if (!positionData || !positionData.players) continue;
        
        const playersArray = positionData.players;
        for (let i = 0; i < playersArray.length; i++){
          // Fixed: Properly check for null/undefined players
          const currentPlayer = playersArray[i];
          if (currentPlayer && typeof currentPlayer !== 'number' && 
              'id' in currentPlayer && currentPlayer.id === player.id) {
            return {
              positionGroup: group,
              detailedPosition: detailedPos,
              playerIndex: i,
              path: ['selected', group, detailedPos, 'players', i.toString()],
              player: currentPlayer as Player
            };
          }
        }
      }
    }
    return {};
  }

  function getEligiblePositions(): void {
    eligiblePositions = []; // Reset the array
    eligiblePositions.push(currentPosition)
    if (currentPosition !== 'Goalkeeper'){
      const fallbacks = getFallbackPos(currentPosition)
      eligiblePositions.push(...fallbacks)
    }
  }

  function getEligiblePlayers(): void {
    eligibleReplacements = [];
    if(eligiblePositions && eligiblePositions.length > 0){
      eligiblePositions.forEach(pos => {
        scanPlayersForPos(pos)
      })
    }
  }

  function scanPlayersForPos(position: string): void {
    const foundPlayerIds = new Set<number>(); // Track found players to avoid duplicates
    
    // Scan roster players
    for (const group of positionGroups) {
      const groupPlayers = playerTeam[group as keyof Team];
      if (Array.isArray(groupPlayers) && groupPlayers.length > 0){
        for(let i = 0; i < groupPlayers.length; i++) {
          const rosterPlayer = groupPlayers[i];
          if(rosterPlayer && typeof rosterPlayer !== 'number' && 
             'detailed_position' in rosterPlayer && 
             rosterPlayer.detailed_position === position && 
             rosterPlayer.id) {
            // Skip if this is the current player or already found
            if ((!player || !player.id || rosterPlayer.id !== player.id) && 
                !foundPlayerIds.has(rosterPlayer.id)){
              foundPlayerIds.add(rosterPlayer.id);
              eligibleReplacements.push(rosterPlayer as Player);
            }
          }
        }
      }
    }
    
    // Also scan subs for eligible replacements
    if (playerTeam.subs && playerTeam.subs.length > 0) {
      for (let i = 0; i < playerTeam.subs.length; i++) {
        const sub = playerTeam.subs[i];
        if (sub && typeof sub !== 'number' && 
            'detailed_position' in sub && 
            sub.detailed_position === position && 
            sub.id) {
          // Skip if this is the current player or already found
          if ((!player || !player.id || sub.id !== player.id) && 
              !foundPlayerIds.has(sub.id)) {
            foundPlayerIds.add(sub.id);
            eligibleReplacements.push(sub as Player);
          }
        }
      }
    }
  }

  function removePlayer(): void {
    if (!currentSlot || !currentSlot.player || !currentSlot.path) return;
    
    const removedPlayer = currentSlot.player;
    const subIndex = subSlot;
    
    // Ensure subs array exists and has enough slots
    if (!playerTeam.subs) {
      playerTeam.subs = [];
    }
    
    // Ensure we have at least subIndex + 1 slots
    while (playerTeam.subs.length <= subIndex) {
      playerTeam.subs.push(null);
    }
    
    // Update the selected position to null
    if (currentSlot.positionGroup && currentSlot.detailedPosition && 
        currentSlot.playerIndex !== undefined) {
      playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex] = null;
    }
    
    // Move player to subs
    playerTeam.subs[subIndex] = removedPlayer;
    
    // Update local state
    player = null;
    currentSlot = {};
    
    // Recalculate scores
    recalculateSectionScores(playerTeam);
    
    // Close dropdown
    showDropdown = false;
    
    // Dispatch event
    import.meta.env.SSR || document.dispatchEvent(new CustomEvent('playerSwapped'));
  }

  function findReplacementSlot(replacementPlayer: Player): ReplacementSlot | null {
    if (!replacementPlayer || !replacementPlayer.id) return null;
    
    // Check selected positions
    for (const group of positionGroups) {
      if (!playerTeam.selected[group]) continue;
      
      const detailedPositions = Object.keys(playerTeam.selected[group]);
      for (const detailedPos of detailedPositions) {
        const positionData = playerTeam.selected[group][detailedPos];
        if (!positionData || !positionData.players) continue;
        
        const playersArray = positionData.players;
        for (let i = 0; i < playersArray.length; i++){
          const currentPlayer = playersArray[i];
          if (currentPlayer && typeof currentPlayer !== 'number' && 
              'id' in currentPlayer && currentPlayer.id === replacementPlayer.id) {
            return {
              positionGroup: group,
              detailedPosition: detailedPos,
              playerIndex: i,
              player: currentPlayer as Player,
              sub: false
            };
          }
        }
      }
    }
    
    // Check subs
    if (playerTeam.subs && playerTeam.subs.length > 0) {
      for (let i = 0; i < playerTeam.subs.length; i++){
        const sub = playerTeam.subs[i];
        if (sub && typeof sub !== 'number' && 
            'id' in sub && sub.id === replacementPlayer.id) {
          return {
            playerIndex: i,
            player: sub as Player,
            sub: true
          };
        }
      }
    }
    
    return null;
  }

  function replacePlayer(replacementPlayer: Player): void {
    if (!replacementPlayer) return;

    // If current slot is empty, we need to find where to place the replacement
    if (!currentSlot || !currentSlot.path || !player) {
      // Find the current component's position in the formation
      for (const group of positionGroups) {
        if (!playerTeam.selected[group]) continue;
        
        const detailedPositions = Object.keys(playerTeam.selected[group]);
        for (const detailedPos of detailedPositions) {
          if (detailedPos === currentPosition) {
            const positionData = playerTeam.selected[group][detailedPos];
            if (!positionData || !positionData.players) continue;
            
            // Find the first null slot in this position
            for (let i = 0; i < positionData.players.length; i++) {
              if (!positionData.players[i]) {
                currentSlot = {
                  positionGroup: group,
                  detailedPosition: detailedPos,
                  playerIndex: i,
                  path: ['selected', group, detailedPos, 'players', i.toString()],
                  player: null
                };
                break;
              }
            }
            break;
          }
        }
        if (currentSlot.path) break;
      }
    }

    if (!currentSlot || !currentSlot.path || 
        !currentSlot.positionGroup || !currentSlot.detailedPosition || 
        currentSlot.playerIndex === undefined) {
      console.error('Could not find valid slot for replacement');
      return;
    }

    const currentPlayer = playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex];
    const replacementSlot = findReplacementSlot(replacementPlayer);

    if (!replacementSlot) {
      console.error('Replacement player not found in any slot');
      return;
    }

    if (replacementSlot.sub) {
      // Replacement is coming from subs
      const subPlayer = playerTeam.subs[replacementSlot.playerIndex];
      
      // Place sub in the current position
      playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex] = subPlayer;
      
      if (currentPlayer) {
        // If there was a player in the position, move them to subs
        playerTeam.subs[replacementSlot.playerIndex] = currentPlayer;
      } else {
        // If position was empty, clear the sub slot
        playerTeam.subs[replacementSlot.playerIndex] = null;
      }
      
      // Update local state
      player = replacementPlayer;
      currentSlot.player = replacementPlayer;
      
    } else if (replacementSlot.positionGroup && replacementSlot.detailedPosition) {
      // Replacement is coming from another position
      const swapPlayer = playerTeam.selected[replacementSlot.positionGroup][replacementSlot.detailedPosition].players[replacementSlot.playerIndex];
      
      // Perform the swap
      playerTeam.selected[currentSlot.positionGroup][currentSlot.detailedPosition].players[currentSlot.playerIndex] = swapPlayer;
      playerTeam.selected[replacementSlot.positionGroup][replacementSlot.detailedPosition].players[replacementSlot.playerIndex] = currentPlayer;
      
      // Update local state
      player = replacementPlayer;
      currentSlot.player = replacementPlayer;
    }
    
    // Recalculate scores
    recalculateSectionScores(playerTeam);
    
    // Reset dropdown
    showDropdown = false;
    selectedReplacement = '';
    
    // Dispatch event
    import.meta.env.SSR || document.dispatchEvent(new CustomEvent('playerSwapped'));
  }

  function handleDropdownMouseEnter(): void {
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

  function handleDropdownMouseLeave(): void {
      dropdownTimeout = setTimeout(() => {
        dropdownFading = true;
        fadeTimeout = setTimeout(() => {
          showDropdown = false;
          dropdownFading = false;
          hoveredReplacement = null;
          showComparison = false;
          const event = new CustomEvent('blurplayer', { 
            bubbles: true,
            detail: { zone: zone } 
          });
          const fieldElement = document.querySelector('.field');
          if (fieldElement) {
            fieldElement.dispatchEvent(event);
          }
        }, 200);
      }, 1000);
  }

  function toggleDropdown(): void {
      showDropdown = !showDropdown;
      if (showDropdown) {
        const event = new CustomEvent('focusplayer', { 
          bubbles: true, 
          detail: { 
            zone: zone,
            dropdownActive: true
          } 
        });
        const fieldElement = document.querySelector('.field');
        if (fieldElement) {
          fieldElement.dispatchEvent(event);
        }
        
        if (dropdownTimeout) {
          clearTimeout(dropdownTimeout);
          dropdownTimeout = null;
        }
      } else {
        const event = new CustomEvent('blurplayer', { 
          bubbles: true,
          detail: { zone: zone }
        });
        const fieldElement = document.querySelector('.field');
        if (fieldElement) {
          fieldElement.dispatchEvent(event);
        }
        hoveredReplacement = null;
        showComparison = false;
      }
  }

  function handleReplacementHover(replacement: Player): void {
    hoveredReplacement = replacement;
    showComparison = true;
  }

  function handleReplacementLeave(): void {
    hoveredReplacement = null;
    showComparison = false;
  }

  // Cleanup on component destroy
  $effect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  });

</script>

<div class="formation-player" style="opacity: {hide ? 0.7 : 1}; transition: opacity 0.4s ease, z-index 0.2s ease; z-index: {showDropdown ? 50 : -999};">
  {#if player}
    <div class="player-name">{formatPlayerName(player.player_name)}</div>
    <img class="player-image" style="opacity: {showDropdown ? 0.4 : 1}; transition: opacity 0.4s ease" src={nationImage} alt={player.player_name} />
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
        onclick={() => removePlayer()}
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
              onmouseenter={() => handleReplacementHover(replacement)}
              onmouseleave={handleReplacementLeave}
              role="menuitem"
              aria-label="Replace player with {replacement.player_name}"
            >
              <PlayerMini player={replacement} showPopup={false} />
              <span class="player-name-option">{formatPlayerName(replacement.player_name)}</span>
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

  <!-- Current Player Hover popup -->
  {#if player}  
  {#if player.detailed_position !== "Goalkeeper"}
   <div class="player-popup" class:comparison-mode={showComparison}>
    <div class="popup-upper-section">
        <div class="popup-info">
            <div><strong>Position: </strong>   {positionAbbrev(player.detailed_position)}</div>
            <div><strong>Age: </strong>   {player.player_age} yrs</div>
        </div>
        
        <div class="team-name">{player.player_team}</div>
      
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
         <span class="metric-label">Atk. Score</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-attk"
             style="width: {(player.attacking_score / 4000 ) * 100}%"
           ></div>
         </div>
       </div>
       
        <div class="metric">
         <span class="metric-label">Goalscoring</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-fin"
             style="width: {(player.finishing_score / 4000 ) * 100}%"
           ></div>
         </div>
       </div>

     </div>
   </div>
   {:else if player.detailed_position === "Goalkeeper"}
   <div class="player-popup" class:comparison-mode={showComparison}>
    <div class="popup-upper-section">
        <div class="popup-info">
            <div><strong>Position: </strong>   {positionAbbrev(player.detailed_position)}</div>
            <div><strong>Age: </strong>   {player.player_age} yrs</div>
        </div>
        <div class="team-name">{player.player_team}</div>
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
           style="width: {(player.keeper_score ?? 0 / 5000) * 100}%"
         ></div>
       </div>
     </div>
   </div>
   {/if}
   {/if}

   <!-- Replacement Player Hover popup -->
  {#if hoveredReplacement}  
   {#if hoveredReplacement.detailed_position !== "Goalkeeper"}
    <div class="player-popup replacement-popup">
      <div class="popup-upper-section">
          <div class="popup-info">
              <div><strong>Position: </strong>   {positionAbbrev(hoveredReplacement.detailed_position)}</div>
              <div><strong>Age: </strong>   {hoveredReplacement.player_age} yrs</div>
          </div>
          
          <div class="team-name">{hoveredReplacement.player_team}</div>
        
      </div>
      <!-- Metrics bar graph -->
      <div class="player-metrics">
        <div class="metric">
          <span class="metric-label">Def. Score</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-def"
              style="width: {(hoveredReplacement.defensive_score / 5000) * 100}%"
            ></div>
          </div>
        </div>

        <div class="metric">
          <span class="metric-label">Poss. Score</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-poss"
              style="width: {(hoveredReplacement.possession_score / 5000 ) * 100}%"
            ></div>
          </div>
        </div>

        <div class="metric">
          <span class="metric-label">Pass. Score</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-pass"
              style="width: {(hoveredReplacement.passing_score / 5000 ) * 100}%"
            ></div>
          </div>
        </div>

        <div class="metric">
          <span class="metric-label">Att. Score</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-attk"
              style="width: {(hoveredReplacement.attacking_score / 5000 ) * 100}%"
            ></div>
          </div>
        </div>

        <div class="metric">
         <span class="metric-label">Goalscoring</span>
         <div class="metric-bar-container">
           <div
             class="metric-bar bar-attk"
             style="width: {(player.finishing_score / 5000 ) * 100}%"
           ></div>
         </div>
       </div>

      </div>
    </div>
    {:else if hoveredReplacement.detailed_position === "Goalkeeper"}
    <div class="player-popup replacement-popup">
      <div class="popup-upper-section">
          <div class="popup-info">
              <div><strong>Position: </strong>   {positionAbbrev(hoveredReplacement.detailed_position)}</div>
              <div><strong>Age: </strong>   {hoveredReplacement.player_age} yrs</div>
          </div>
          <div class="team-name">{hoveredReplacement.player_team}</div>
      </div>
      <div class="metric">
        <span class="metric-label">Passing</span>
        <div class="metric-bar-container">
          <div
            class="metric-bar bar-pass"
            style="width: {(hoveredReplacement.passing_score / 5000) * 100}%"
          ></div>
        </div>
      </div>
  
      <div class="metric">
        <span class="metric-label">Keeping</span>
        <div class="metric-bar-container">
          <div
            class="metric-bar bar-poss"
            style="width: {(hoveredReplacement.keeper_score ?? 0 / 5000) * 100}%"
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
    transition: transform 0.1s ease, border 0.2s ease;
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
    z-index: 100;
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
    overflow-x: hidden;
    opacity: 1;
    transition: opacity 0.2s ease-out;
    z-index: 100;
  }
  
  .replacement-dropdown.fade-out {
    opacity: 0;
    pointer-events: none;
  }

  /* Hide scrollbar for Chrome, Safari and Opera */
  .replacement-dropdown::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .replacement-dropdown {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
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
    transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Shift current player popup left when comparing */
  .player-popup.comparison-mode {
    transform: translateX(-13rem);
    margin-left: 0;
  }

  /* Replacement popup styling */
  .player-popup.replacement-popup {
    display: block;
    opacity: 1;
    transform: scale(1);
    animation: popupFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes popupFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .formation-player:hover .player-popup:not(.replacement-popup) {
    display: block;
    opacity: 1;
  }

  .popup-upper-section {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .popup-info {
    flex: 1;
    padding-right: 0.5rem;
  }

  .team-name {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 0.65rem;
    color: #666;
    text-align: right;
    max-width: 40%;
    line-height: 1.2;
    white-space: normal;
    word-wrap: break-word;
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

  .bar-fin {
    background-color: #62058d;
  }
</style>