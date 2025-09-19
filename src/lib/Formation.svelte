<script lang="ts">
    import FormationPlayer from "./FormationPlayer.svelte";
    import FormationTab from "./FormationTab.svelte";
    import type { Team } from "$lib/types/types";
    import PlayerMini from "./PlayerMini.svelte";
    import ZoneDisplay from "./ZoneDisplay.svelte";
    import { teams } from "./stores/teams.svelte";

    let {
      team = {} as Team,
      opponent = {} as Team,
      viewOpponent = false,
      opponentMode = 0, // 0 = Direct comparison // 1 = Matchup view,
      tabDisplay = 0, // 0 = Positional groups // 2 = Individual zones (to be created)
      base = true,
      zonesVisible = true
    } = $props();

    let activeTab = $state(null)
    let activeZone = $state(null) // For zone-based highlighting
    let focusedZone = $state(null) 
    let previousFocusedZone = $state(null)
    let dropdownActive = $state(false) 
    let zoneData = $derived(initializeZoneData());
   
    // Zone to group mapping for zone-based highlighting
    const zoneToGroup = {
        15: 'attackers', 16: 'attackers', 17: 'attackers',
        12: 'attackers', 13: 'attackers', 14: 'attackers',
        9: 'midfielders', 10: 'midfielders', 11: 'midfielders',
        6: 'midfielders', 7: 'midfielders', 8: 'midfielders',
        3: 'defenders', 4: 'defenders', 5: 'defenders',
        1: 'keepers'
    };

    
    const zoneMatchups ={
        3: 17,   // LB vs RW
        4: 16,   // CB vs ST
        5: 15,   // RB vs LW
        
        6: 14,   // LM vs RF
        7: 13,   // CM vs CF
        8: 12,   // RM vs LF
        
        9: 11,   // LAM vs RAM
        10: 10,  // CAM vs CAM (mirrors)
        11: 9,   // RAM vs LAM
        
        12: 8,   // LF vs RM
        13: 7,   // CF vs CM
        14: 6,   // RF vs LM
        
        15: 5,   // LW vs RB
        16: 4,   // ST vs CB
        17: 3,   // RW vs LB
        
        // Unused zones
        0: null,
        2: null,
    }

    const zoneAdjacency = {
        1: [],  // Keeper not factored for matchup view
        3: [4, 6],
        4: [3, 5, 7],
        5: [4, 8],
        6: [3, 7, 9],
        7: [4, 6, 8, 10],
        8: [5, 7, 11],
        9: [6, 10, 12],
        10: [7, 9, 11, 13],
        11: [8, 10, 14],
        12: [9, 13, 15],
        13: [10, 12, 14, 16],
        14: [11, 13, 17],
        15: [12, 16],
        16: [13, 15, 17],
        17: [14, 16]
    };

    // zoneData = initializeZoneData()


  

    function setActiveTab(tab){
        activeTab = tab;
    }

    function setActiveZone(zone){
        activeZone = zone;
    }

    function getZoneDisplay(zone) {
        const data = zoneData[zone];
        if (!data) return null;
        
        return {
            teamPlayers: data.teamPlayers,
            opponentPlayers: data.opponentPlayers,
            scores: data.scores,
            strengthValue: data.scores?.total || 0,
            isEmpty: data.isEmpty,
            sourceZones: data.sourceZones
        };
    }
    
    function initializeZoneData() {
        const data = {};
        const emptyZones = [];
        
        // Process each zone
        const zones = [1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
        for (const zone of zones) {
            const zoneResult = processZone(zone, team, opponent, opponentMode);
            data[zone] = zoneResult;
            
            if (zoneResult.isEmpty) {
                emptyZones.push(zone);
            }
        }
        
        // Second pass: Calculate empty zone scores based on adjacent filled zones
        for (const zone of emptyZones) {
            const adjacentZones = zoneAdjacency[zone] || [];
            const filledAdjacent = adjacentZones.filter(adj => !data[adj]?.isEmpty);
            
            if (filledAdjacent.length > 0) {
                const scores = averageAdjacentScores(filledAdjacent, data);
                data[zone] = {
                    ...data[zone],
                    scores,
                    sourceZones: filledAdjacent
                };
            } else {
                data[zone] = {
                    ...data[zone],
                    scores: { total: 0, finishing: 0, attacking: 0, possession: 0, passing: 0, defensive: 0 },
                    sourceZones: []
                };
            }
        }
        
        return data;
    }

    function processZone(zone, team, opponent, opponentMode) {
        const teamPlayers = [];
        const opponentPlayers = [];
        
        // Get team players
        if (team.selected) {
            Object.values(team.selected).forEach(group => {
                Object.entries(group).forEach(([positionName, positionData]) => {
                    if (positionData.zone === zone) {
                        positionData.players.forEach(player => {
                            if (player) {
                                teamPlayers.push({
                                    player,
                                    currentPosition: positionName  
                                });
                            }    
                        });
                    }
                });
            });
        }
        
        // Get opponent players based on current mode only
        if (opponent.selected) {
            const targetZone = opponentMode === 0 ? zone : zoneMatchups[zone];
            
            if (targetZone) {
                Object.values(opponent.selected).forEach(group => {
                    Object.entries(group).forEach(([positionName, positionData]) => {
                        if (positionData.zone === targetZone) {
                            positionData.players.forEach(player => {
                                if (player) {
                                    opponentPlayers.push({
                                        player,
                                        currentPosition: positionName  
                                    });
                                }
                            });
                        }
                    });
                });
            }
        }
        
        const isEmpty = teamPlayers.length === 0 && opponentPlayers.length === 0;
        
        return {
            teamPlayers,
            opponentPlayers,
            scores: isEmpty ? null : calculateAllMatchups(
                teamPlayers.map(tp => tp.player), 
                opponentPlayers.map(op => op.player)  
            ),
            isEmpty
        };
    }

    function calculateAllMatchups(teamPlayers, opponentPlayers) {
        return {
            total: calculateMatchup(teamPlayers, opponentPlayers, 'total_score'),
            finishing: calculateMatchup(teamPlayers, opponentPlayers, 'finishing_score'),
            attacking: calculateMatchup(teamPlayers, opponentPlayers, 'attacking_score'),
            possession: calculateMatchup(teamPlayers, opponentPlayers, 'possession_score'),
            passing: calculateMatchup(teamPlayers, opponentPlayers, 'passing_score'),
            defensive: calculateMatchup(teamPlayers, opponentPlayers, 'defensive_score'),
        };
    }

    function averageAdjacentScores(adjacentZones, data) {
        const scores = {
            total: 0,
            finishing: 0,
            attacking: 0,
            possession: 0,
            passing: 0,
            defensive: 0
        };
        
        let validCount = 0;
        adjacentZones.forEach(zone => {
            const zoneScores = data[zone].scores
            if (zoneScores) {
                Object.keys(scores).forEach(key => {
                    scores[key] += zoneScores[key] || 0;
                });
                validCount++;
            }
        });
        
        // Average the scores
        if (validCount > 0) {
            Object.keys(scores).forEach(key => {
                scores[key] = scores[key] / validCount * 0.5; // Reduce strength for interpolated zones
            });
        }
        
        return scores;
    }

    function getZoneColor(strength, scoreType = 'total') {
        const value = typeof strength === 'object' 
            ? strength.scores?.[scoreType] || 0
            : strength;
        
        if (Math.abs(value) < 5) return 'transparent';
        
        const color = value > 0 ? '59, 130, 246' : '239, 68, 68';
        const opacity = Math.min(Math.abs(value) / 100 * 0.35, 0.35);
        return `rgba(${color}, ${opacity})`;
    }

    // Get zone-specific scores when in zone mode
    function getZoneScores(zone) {
        const group = zoneToGroup[zone];
        if (!group || !team.scores) return null;
        
        // For now, return the group scores - you can customize this
        // to have zone-specific scoring if needed
        return group === 'keepers' ? team.scores.keeper : team.scores[group];
    }

    function hasZoneInFormation(zone, team) {
        if (!team.selected) return false;
        for (const group of Object.values(team.selected)) {
            for (const positionData of Object.values(group)) {
                if (positionData.zone === zone) {
                    return true;
                }
            }
        }
        return false;
    }


    // Get zone-specific player count
    function getZonePlayerCount(zone) {
        return getSlotsByZone(zone, team).filter(slot => slot.player).length;
    }

    // Handle focus event from FormationPlayer
    function handlePlayerFocus(event) {
        if (focusedZone !== event.detail.zone) {
            previousFocusedZone = focusedZone;
            focusedZone = event.detail.zone;
        }
        dropdownActive = true;
    }

    // Handle blur event from FormationPlayer
    function handlePlayerBlur(event) {
        if (event.detail && event.detail.zone === focusedZone) {
            dropdownActive = false;
        }
    }

    function getZoneZIndex(zone) {
        if (focusedZone === zone) return 100;
        if (previousFocusedZone === zone) return 90;
        return 5;
    }

    // Helper: Gets current number of players in current formation positional group
    const playerCount = groupName =>
      Object.values(team.selected[groupName] || {})
        .reduce((sum, posData) => sum + posData.players.length, 0);

    // Helper: Returns an array of formation slots for the given zone
    function getSlotsByZone(zone, team) {
      const slots = [];
      if (!team.selected) return slots;
      Object.values(team.selected).forEach(group => {
        Object.entries(group).forEach(([positionName, positionData]) => {
          if (positionData.zone === zone) {
            for (let i = 0; i < positionData.max; i++) {
              const player = i < positionData.players.length ? positionData.players[i] : null;
              
              slots.push({
                player,
                currentPosition: positionName
              });
            }
          }
        });
      });
      return slots;
    }

    function calculateMatchup(teamPlayers, opponentPlayers, scoreType) {
        const teamScore = teamPlayers.reduce((sum, player) => {
            const score = scoreType === 'keeper_score' ? (player[scoreType] || 0) : player[scoreType];
            return sum + score;
        }, 0);
        
        const opponentScore = opponentPlayers.reduce((sum, player) => {
            const score = scoreType === 'keeper_score' ? (player[scoreType] || 0) : player[scoreType];
            return sum + score;
        }, 0);
        
        // Return difference: positive = team stronger, negative = opponent stronger
        // Scale to -100 to 100 range (adjust divisor as needed based on your score ranges)
        const difference = teamScore - opponentScore;
        const scaledDifference = Math.max(-100, Math.min(100, difference / 10));
        
        return scaledDifference;
    }
</script>

<div class="field" onfocusplayer={handlePlayerFocus} onblurplayer={handlePlayerBlur}>
    {#if zonesVisible}
    <div class="zone-lines">
      <!-- internal horizontal boundaries (6 rows ⇒ 5 lines) -->
      <div class="horizontal-line" style="top: 17.5%;"></div>
      <div class="horizontal-line" style="top: 32.5%;"></div>
      <div class="horizontal-line" style="top: 47.5%;"></div>
      <div class="horizontal-line" style="top: 62.5%;"></div>
      <div class="horizontal-line" style="top: 80%;"></div>
      <div class="vertical-line" style="left: 35%;"></div>
      <div class="vertical-line" style="left: 65%;"></div>
    </div>
    {/if}
    {#if !base}
        <!-- Zone overlays for strength visualization -->
        <div class="zone-overlays">
            {#each [1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] as zone}
                {@const displayData = getZoneDisplay(zone)}
                {#if displayData && displayData.scores}
                    <div 
                        class="zone-overlay zone-overlay-{zone}"
                        style="background-color: {getZoneColor(displayData.strengthValue)}"
                    ></div>
                {/if}
            {/each}
        </div>
    {/if}

    <!-- Conditional hover zones based on 'base' prop -->
    {#if base}
      <!-- Group-based hover zones (original behavior) -->
      <div class="hover-zones">
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('attackers')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 0%; height: 32.5%;"
        >
          {#if activeTab === 'attackers'}
            <div class="tab-container">
              <FormationTab group="attackers" scores={team.scores.attackers} playerCount={playerCount('attackers')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('midfielders')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 32.5%; height: 30%;"
        >
          {#if activeTab === 'midfielders'}
            <div class="tab-container">
              <FormationTab group="midfielders" scores={team.scores.midfielders} playerCount={playerCount('midfielders')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('defenders')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 62.5%; height: 17.5%;"
        >
          {#if activeTab === 'defenders'}
            <div class="tab-container">
              <FormationTab group="defenders" scores={team.scores.defenders} playerCount={playerCount('defenders')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('keepers')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 80%; height: 20%;"
        >
          {#if activeTab === 'keepers'}
            <div class="tab-container">
              <FormationTab group="keepers" scores={team.scores.keeper} playerCount={playerCount('keepers')}/>
            </div>
          {/if}
        </div>
      </div>
    {:else if !base && tabDisplay === 0}
      <div class="hover-zones">
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('attackers')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 0%; height: 32.5%;"
        >
          {#if activeTab === 'attackers'}
            <div class="tab-container">
              <FormationTab group="attackers" scores={team.scores.attackers} playerCount={playerCount('attackers')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('midfielders')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 32.5%; height: 30%;"
        >
          {#if activeTab === 'midfielders'}
            <div class="tab-container">
              <FormationTab group="midfielders" scores={team.scores.midfielders} playerCount={playerCount('midfielders')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('defenders')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 62.5%; height: 17.5%;"
        >
          {#if activeTab === 'defenders'}
            <div class="tab-container">
              <FormationTab group="defenders" scores={team.scores.defenders} playerCount={playerCount('defenders')}/>
            </div>
          {/if}
        </div>
  
        <div
          role="presentation"
          onmouseenter={()=> setActiveTab('keepers')}
          onmouseleave={()=> setActiveTab(null)}
          class="hover-zone"
          style="top: 80%; height: 20%;"
        >
          {#if activeTab === 'keepers'}
            <div class="tab-container">
              <FormationTab group="keepers" scores={team.scores.keeper} playerCount={playerCount('keepers')}/>
            </div>
          {/if}
        </div>
      </div>
    {:else if !base && tabDisplay === 1}
      <!-- Zone-based hover zones (new behavior) -->
      <div class="hover-zones-detailed">
        <!-- Row 6 (Top): Zones 15, 16, 17 -->
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(15)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 0%; top: 0%; width: 35%; height: 17.5%;"
        >
          {#if activeZone === 15}
            {@const displayData = getZoneDisplay(15)}
            <div class="zone-display-container-left" >
                <ZoneDisplay 
                fieldPosition={"Left Wing"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={15}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(16)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 0%; width: 30%; height: 17.5%;"
        >
          {#if activeZone === 16}
            {@const displayData = getZoneDisplay(16)}
            <div class="zone-display-container" >
                <ZoneDisplay 
                fieldPosition={"Centre Forward"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={16}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(17)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 65%; top: 0%; width: 35%; height: 17.5%;"
        >
          {#if activeZone === 17}
            {@const displayData = getZoneDisplay(17)}
            <div class="zone-display-container-right" >
                <ZoneDisplay 
                fieldPosition={"Right Wing"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={17}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <!-- Row 5: Zones 12, 13, 14 -->
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(12)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 0%; top: 17.5%; width: 35%; height: 15%;"
        >
          {#if activeZone === 12}
            {@const displayData = getZoneDisplay(12)}
            <div class="zone-display-container-left">
                <ZoneDisplay 
                fieldPosition={"Left Wing"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={12}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(13)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 17.5%; width: 30%; height: 15%;"
        >
          {#if activeZone === 13}
            {@const displayData = getZoneDisplay(13)}
            <div class="zone-display-container">
                <ZoneDisplay 
                fieldPosition={"Attacking Midfield"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={13}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(14)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 65%; top: 17.5%; width: 35%; height: 15%;"
        >
          {#if activeZone === 14}
            {@const displayData = getZoneDisplay(14)}
            <div class="zone-display-container-right">
                <ZoneDisplay 
                fieldPosition={"Right Wing"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={14}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <!-- Row 4: Zones 9, 10, 11 -->
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(9)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 0%; top: 32.5%; width: 35%; height: 15%;"
        >
          {#if activeZone === 9}
            {@const displayData = getZoneDisplay(9)}
            <div class="zone-display-container-left">
                <ZoneDisplay 
                fieldPosition={"Left Midfield"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={9}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(10)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 32.5%; width: 30%; height: 15%;"
        >
          {#if activeZone === 10}
            {@const displayData = getZoneDisplay(10)}
            <div class="zone-display-container">
                <ZoneDisplay 
                fieldPosition={"Central Midfield"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={10}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(11)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 65%; top: 32.5%; width: 35%; height: 15%;"
        >
        {#if activeZone === 11}
            {@const displayData = getZoneDisplay(11)}
            <div class="zone-display-container-right">
                <ZoneDisplay 
                fieldPosition={"Right Midfield"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={11}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
        {/if}
        </div>

        <!-- Row 3: Zones 6, 7, 8 -->
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(6)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 0%; top: 47.5%; width: 35%; height: 15%;"
        >
          {#if activeZone === 6}
            {@const displayData = getZoneDisplay(6)}
            <div class="zone-display-container-left">
                <ZoneDisplay 
                fieldPosition={"Left Wingback"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={6}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(7)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 47.5%; width: 30%; height: 15%;"
        >
          {#if activeZone === 7}
            {@const displayData = getZoneDisplay(7)}
            <div class="zone-display-container">
                <ZoneDisplay 
                fieldPosition={"Defensive Midfield"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={7}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(8)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 65%; top: 47.5%; width: 35%; height: 15%;"
        >
          {#if activeZone === 8}
            {@const displayData = getZoneDisplay(8)}
            <div class="zone-display-container-right">
                <ZoneDisplay 
                fieldPosition={"Right Wingback"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={8}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <!-- Row 2: Zones 3, 4, 5 -->
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(3)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 0%; top: 62.5%; width: 35%; height: 17.5%;"
        >
          {#if activeZone === 3}
            {@const displayData = getZoneDisplay(3)}
            <div class="zone-display-container-left">
                <ZoneDisplay 
                fieldPosition={"Left Fullback"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={3}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(4)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 62.5%; width: 30%; height: 17.5%;"
        >
          {#if activeZone === 4}
            {@const displayData = getZoneDisplay(4)}
            <div class="zone-display-container">
                <ZoneDisplay 
                fieldPosition={"Centre Back"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={4}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(5)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 65%; top: 62.5%; width: 35%; height: 17.5%;"
        >
          {#if activeZone === 5}
            {@const displayData = getZoneDisplay(5)}
            <div class="zone-display-container-right">
                <ZoneDisplay 
                fieldPosition={"Right Fullback"} 
                teamPlayers={displayData.teamPlayers.map(tp => tp.player)}
                opponentPlayers={displayData.opponentPlayers.map(op => op.player)}
                zone={5}
                mode={opponentMode}
                teamName={team.name}
                opponentName={opponent.name}
                />
            </div>
          {/if}
        </div>

        <!-- Row 1 (Bottom): Zone 1 (Keeper) -->
        {#if opponentMode !== 1}
        <div
          role="presentation"
          onmouseenter={()=> setActiveZone(1)}
          onmouseleave={()=> setActiveZone(null)}
          class="hover-zone-square"
          style="left: 35%; top: 80%; width: 30%; height: 20%;"
        >
          {#if activeZone === 1}
            <div class="tab-container-zone">
              <FormationTab group="Zone 1" scores={getZoneScores(1)} playerCount={getZonePlayerCount(1)}/>
            </div>
          {/if}
        </div>
        {/if}
      </div>
    {/if}
    

<!-- Zone 15 -->
{#if base ? hasZoneInFormation(15, team) : (getZoneDisplay(15).teamPlayers.length || getZoneDisplay(15).opponentPlayers.length)}
    <div class="zone zone-15" style="z-index: {getZoneZIndex(15)}">
        {#if base}
            {@const slots = getSlotsByZone(15, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={15}
                    hide={focusedZone !== 15 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(15)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 16 -->
{#if base ? hasZoneInFormation(16, team) : (getZoneDisplay(16).teamPlayers.length || getZoneDisplay(16).opponentPlayers.length)}
    <div class="zone zone-16" style="z-index: {getZoneZIndex(16)}">
        {#if base}
            {@const slots = getSlotsByZone(16, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={16}
                    hide={focusedZone !== 16 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(16)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 17 -->
{#if base ? hasZoneInFormation(17, team) : (getZoneDisplay(17).teamPlayers.length || getZoneDisplay(17).opponentPlayers.length)}
    <div class="zone zone-17" style="z-index: {getZoneZIndex(17)}">
        {#if base}
            {@const slots = getSlotsByZone(17, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={17}
                    hide={focusedZone !== 17 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(17)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 12 -->
{#if base ? hasZoneInFormation(12, team) : (getZoneDisplay(12).teamPlayers.length || getZoneDisplay(12).opponentPlayers.length)}
    <div class="zone zone-12" style="z-index: {getZoneZIndex(12)}">
        {#if base}
            {@const slots = getSlotsByZone(12, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={12}
                    hide={focusedZone !== 12 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(12)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 13 -->
{#if base ? hasZoneInFormation(13, team) : (getZoneDisplay(13).teamPlayers.length || getZoneDisplay(13).opponentPlayers.length)}
    <div class="zone zone-13" style="z-index: {getZoneZIndex(13)}">
        {#if base}
            {@const slots = getSlotsByZone(13, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={13}
                    hide={focusedZone !== 13 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(13)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 14 -->
{#if base ? hasZoneInFormation(14, team) : (getZoneDisplay(14).teamPlayers.length || getZoneDisplay(14).opponentPlayers.length)}
    <div class="zone zone-14" style="z-index: {getZoneZIndex(14)}">
        {#if base}
            {@const slots = getSlotsByZone(14, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={14}
                    hide={focusedZone !== 14 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(14)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 9 -->
{#if base ? hasZoneInFormation(9, team) : (getZoneDisplay(9).teamPlayers.length || getZoneDisplay(9).opponentPlayers.length)}
    <div class="zone zone-9" style="z-index: {getZoneZIndex(9)}">
        {#if base}
            {@const slots = getSlotsByZone(9, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={9}
                    hide={focusedZone !== 9 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(9)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 10 -->
{#if base ? hasZoneInFormation(10, team) : (getZoneDisplay(10).teamPlayers.length || getZoneDisplay(10).opponentPlayers.length)}
    <div class="zone zone-10" style="z-index: {getZoneZIndex(10)}">
        {#if base}
            {@const slots = getSlotsByZone(10, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={10}
                    hide={focusedZone !== 10 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(10)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 11 -->
{#if base ? hasZoneInFormation(11, team) : (getZoneDisplay(11).teamPlayers.length || getZoneDisplay(11).opponentPlayers.length)}
    <div class="zone zone-11" style="z-index: {getZoneZIndex(11)}">
        {#if base}
            {@const slots = getSlotsByZone(11, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={11}
                    hide={focusedZone !== 11 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(11)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 6 -->
{#if base ? hasZoneInFormation(6, team) : (getZoneDisplay(6).teamPlayers.length || getZoneDisplay(6).opponentPlayers.length)}
    <div class="zone zone-6" style="z-index: {getZoneZIndex(6)}">
        {#if base}
            {@const slots = getSlotsByZone(6, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={6}
                    hide={focusedZone !== 6 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(6)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 7 -->
{#if base ? hasZoneInFormation(7, team) : (getZoneDisplay(7).teamPlayers.length || getZoneDisplay(7).opponentPlayers.length)}
    <div class="zone zone-7" style="z-index: {getZoneZIndex(7)}">
        {#if base}
            {@const slots = getSlotsByZone(7, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={7}
                    hide={focusedZone !== 7 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(7)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 8 -->
{#if base ? hasZoneInFormation(8, team) : (getZoneDisplay(8).teamPlayers.length || getZoneDisplay(8).opponentPlayers.length)}
    <div class="zone zone-8" style="z-index: {getZoneZIndex(8)}">
        {#if base}
            {@const slots = getSlotsByZone(8, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={8}
                    hide={focusedZone !== 8 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(8)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 3 -->
{#if base ? hasZoneInFormation(3, team) : (getZoneDisplay(3).teamPlayers.length || getZoneDisplay(3).opponentPlayers.length)}
    <div class="zone zone-3" style="z-index: {getZoneZIndex(3)}">
        {#if base}
            {@const slots = getSlotsByZone(3, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={3}
                    hide={focusedZone !== 3 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(3)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 4 -->
{#if base ? hasZoneInFormation(4, team) : (getZoneDisplay(4).teamPlayers.length || getZoneDisplay(4).opponentPlayers.length)}
    <div class="zone zone-4" style="z-index: {getZoneZIndex(4)}">
        {#if base}
            {@const slots = getSlotsByZone(4, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={4}
                    hide={focusedZone !== 4 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(4)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 5 -->
{#if base ? hasZoneInFormation(5, team) : (getZoneDisplay(5).teamPlayers.length || getZoneDisplay(4).opponentPlayers.length)}
    <div class="zone zone-5" style="z-index: {getZoneZIndex(4)}">
        {#if base}
            {@const slots = getSlotsByZone(5, team)}
            {#each slots as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={5}
                    hide={focusedZone !== 4 && dropdownActive}
                />
            {/each}
        {:else}
            {@const displayData = getZoneDisplay(5)}
            
            <div class="zone-players-container">
                {#if displayData.teamPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.teamPlayers as slot, i ('team-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                {#if viewOpponent && displayData.opponentPlayers.length > 0}
                    <div class="player-row">
                        {#each displayData.opponentPlayers as slot, i ('opponent-' + slot.player.id + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Zone 1 -->
{#if getSlotsByZone(1, team).length || getSlotsByZone(1, opponent).length}
    <div class="zone zone-1" style="z-index: {getZoneZIndex(1)}">
        {#if base}
            {#each getSlotsByZone(1, team) as slot, i (slot.currentPosition + '-' + i)}
                <FormationPlayer
                    player={slot.player}
                    currentPosition={slot.currentPosition}
                    zone={1}
                    hide={focusedZone !== 1 && dropdownActive}
                />
            {/each}
        {:else}
            <div class="zone-players-container">
                <!-- Friendly team row -->
                {#if getSlotsByZone(1, team).length > 0 && opponentMode === 0}
                    <div class="player-row">
                        {#each getSlotsByZone(1, team) as slot, i (slot.currentPosition + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={1}/>
                        {/each}
                    </div>
                {/if}
                
                <!-- Opponent team row -->
                {#if viewOpponent && getSlotsByZone(1, opponent).length > 0 && opponentMode === 0}
                    <div class="player-row">
                        {#each getSlotsByZone(1, opponent) as slot, i ('opponent-' + slot.currentPosition + '-' + i)}
                            <PlayerMini player={slot.player} showPopup={true} borderCode={2}/>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

</div>

<style>
    .field {
      position: relative;
      width: 60%;
      height: 70rem;
      background: linear-gradient(#228B22, #006400);
      border: 4px solid #004d00;
      box-shadow: inset 0 0 30px #002200;
    }
    
    /* Apply a flex layout with increased gap for better spacing */
    .zone {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 5.5rem;
      z-index: 2;
    }
    
    .zone > :global(*) {
      pointer-events: auto;
    }

    .zone-overlays {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1; /* Above field, below players */
    }

    .zone-overlay {
        position: absolute;
        transition: background-color 0.3s ease;
    }

    /* Match your existing zone positions and sizes */
    .zone-overlay-15 { left: 0%; top: 0%; width: 35%; height: 17.5%; }
    .zone-overlay-16 { left: 35%; top: 0%; width: 30%; height: 17.5%; }
    .zone-overlay-17 { left: 65%; top: 0%; width: 35%; height: 17.5%; }

    .zone-overlay-12 { left: 0%; top: 17.5%; width: 35%; height: 15%; }
    .zone-overlay-13 { left: 35%; top: 17.5%; width: 30%; height: 15%; }
    .zone-overlay-14 { left: 65%; top: 17.5%; width: 35%; height: 15%; }

    .zone-overlay-9 { left: 0%; top: 32.5%; width: 35%; height: 15%; }
    .zone-overlay-10 { left: 35%; top: 32.5%; width: 30%; height: 15%; }
    .zone-overlay-11 { left: 65%; top: 32.5%; width: 35%; height: 15%; }

    .zone-overlay-6 { left: 0%; top: 47.5%; width: 35%; height: 15%; }
    .zone-overlay-7 { left: 35%; top: 47.5%; width: 30%; height: 15%; }
    .zone-overlay-8 { left: 65%; top: 47.5%; width: 35%; height: 15%; }

    .zone-overlay-3 { left: 0%; top: 62.5%; width: 35%; height: 17.5%; }
    .zone-overlay-4 { left: 35%; top: 62.5%; width: 30%; height: 17.5%; }
    .zone-overlay-5 { left: 65%; top: 62.5%; width: 35%; height: 17.5%; }

    .zone-overlay-1 { left: 35%; top: 80%; width: 30%; height: 20%; }

    /* Attacker Row (Row 6, Top: Zones 15, 16, 17) */
    .zone-15 { position: absolute; left: 20%; top: 10%; transform: translate(-50%, -50%); }
    .zone-16 { position: absolute; left: 50%; top: 10%; transform: translate(-50%, -50%); }
    .zone-17 { position: absolute; left: 80%; top: 10%; transform: translate(-50%, -50%); }
    
    /* AM/Winger Row (Row 5: Zones 12, 13, 14) */
    .zone-12 { position: absolute; left: 20%; top: 25%; transform: translate(-50%, -50%); }
    .zone-13 { position: absolute; left: 50%; top: 25%; transform: translate(-50%, -50%); }
    .zone-14 { position: absolute; left: 80%; top: 25%; transform: translate(-50%, -50%); }
    
    /* Central Midfield Row (Row 4: Zones 9, 10, 11) */
    .zone-9  { position: absolute; left: 20%; top: 40%; transform: translate(-50%, -50%); }
    .zone-10 { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); }
    .zone-11 { position: absolute; left: 80%; top: 40%; transform: translate(-50%, -50%); }
    
    /* Wing Back / DM Row (Row 3: Zones 6, 7, 8) */
    .zone-6 { position: absolute; left: 20%; top: 55%; transform: translate(-50%, -50%); }
    .zone-7 { position: absolute; left: 50%; top: 55%; transform: translate(-50%, -50%); }
    .zone-8 { position: absolute; left: 80%; top: 55%; transform: translate(-50%, -50%); }
    
    /* Defender Row (Row 2: Zones 3, 4, 5) */
    .zone-3 { position: absolute; left: 20%; top: 70%; transform: translate(-50%, -50%); }
    .zone-4 { position: absolute; left: 50%; top: 70%; transform: translate(-50%, -50%); }
    .zone-5 { position: absolute; left: 80%; top: 70%; transform: translate(-50%, -50%); }
    
    /* Keeper Row (Row 1, Bottom: Zone 1) */
    .zone-1 { position: absolute; left: 50%; top: 90%; transform: translate(-50%, -50%); }

    .zone-lines {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    .horizontal-line {
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.25);
    }

    .vertical-line {
      position: absolute;
      top: 0;
      height: 100%;
      width: 2px;
      background: rgba(255, 255, 255, 0.25);
    }

    /* Group-based hover zones */
    .hover-zones {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        z-index: 1;
        pointer-events: none;
    }
    
    .hover-zone {
        position: absolute;
        left: 0;
        width: 100%;
        background-color: transparent;
        pointer-events: auto;
        transition: background-color 0.25s ease;
        overflow: visible;
    }
 
    .hover-zone:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    /* Zone-based hover zones (detailed) */
   .hover-zones-detailed {
       position: absolute;
       top: 0; left: 0;
       width: 100%; height: 100%;
       z-index: 1;
       pointer-events: none;
   }

   .hover-zone-square {
       position: absolute;
       background-color: transparent;
       pointer-events: auto;
       transition: background-color 0.25s ease;
       overflow: visible;
       border: 1px solid transparent;
   }

   .hover-zone-square:hover {
       background-color: rgba(255, 255, 255, 0.12);
       border: 1px solid rgba(255, 255, 255, 0.2);
   }

   .tab-container {
       position: absolute;
       left: 100%;     
       top: 50%;       
       transform: translateY(-50%);
       pointer-events: auto;
   }

     .zone-display-container {
       position: absolute;
       left: 220%;     
       /* top: 50%;        */
       transform: translateY(-30%);
       pointer-events: auto;
       z-index: 1000;
   }

   .zone-display-container-right {
        position: absolute;
        left: 102%;     
        /* top: 50%;        */
        transform: translateY(-30%);
        pointer-events: auto;
        z-index: 1000;
   }

      .zone-display-container-left {
        position: absolute;
        left: 289%;     
        /* top: 50%;        */
        transform: translateY(-30%);
        pointer-events: auto;
        z-index: 1000;
   }

   .top-left {
        top: 60%;
        transform: translateY(-20%);
   }

   .tab-container-zone {
       position: absolute;
       top: 50%;       
       transform: translateY(-50%);
       pointer-events: auto;
       z-index: 1000;
       /* Position based on zone location */
   }


    .zone-players-container {
          display: flex;
          flex-direction: column;
          gap: 1.6rem;
    }
    
    .player-row {
        display: flex;
        flex-direction: row;
        gap: 1.2rem;
        justify-content: center;
    }

   /* Position zone tabs appropriately based on their location */
   .hover-zone-square:nth-child(1) .tab-container-zone,
   .hover-zone-square:nth-child(4) .tab-container-zone,
   .hover-zone-square:nth-child(7) .tab-container-zone,
   .hover-zone-square:nth-child(10) .tab-container-zone,
   .hover-zone-square:nth-child(13) .tab-container-zone {
       /* Left zones - show tab on left */
       right: 100%;
       left: auto;
       margin-right: 10px;
   }

   .hover-zone-square:nth-child(3) .tab-container-zone,
   .hover-zone-square:nth-child(6) .tab-container-zone,
   .hover-zone-square:nth-child(9) .tab-container-zone,
   .hover-zone-square:nth-child(12) .tab-container-zone,
   .hover-zone-square:nth-child(15) .tab-container-zone {
       /* Right zones - show tab on right */
       left: 100%;
       right: auto;
       margin-left: 10px;
   }

   .hover-zone-square:nth-child(2) .tab-container-zone,
   .hover-zone-square:nth-child(5) .tab-container-zone,
   .hover-zone-square:nth-child(8) .tab-container-zone,
   .hover-zone-square:nth-child(11) .tab-container-zone,
   .hover-zone-square:nth-child(14) .tab-container-zone,
   .hover-zone-square:nth-child(16) .tab-container-zone {
       /* Center zones - show tab on right */
       left: 100%;
       right: auto;
       margin-left: 10px;
   }
 </style>