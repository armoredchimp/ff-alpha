<script lang="ts">
    import FormationTab from "./FormationTab.svelte";
    import FormationZone from "./FormationZone.svelte";
    import FormationDetailPanel from "./FormationDetailPanel.svelte";
    import type { Team } from "$lib/types/types";
    import { calculateGroupMatchup, getGroupStrengthColor } from "./utils/team";
    import { zoneMatchups, zoneAdjacency, ZONE_IDS, ZONE_LAYOUT, KEEPER_ZONE,
         GROUP_ROWS } from "./utils/formation";

    let {
      team = {} as Team,
      opponent = {} as Team,
      viewOpponent = false,
      opponentMode = 0, // 0 = Direct comparison // 1 = Matchup view,
      tabDisplay = 0, // 0 = Positional groups // 1 = Individual zones
      base = true,
      zonesVisible = true,
      mode = null
    } = $props();

    let resolvedMode = $derived(mode ?? (base ? 'select' : 'preview'));

    let activeTab = $state(null)
    let activeZone = $state(null) // For zone-based highlighting
    let focusedZone = $state(null)
    let previousFocusedZone = $state(null)
    let dropdownActive = $state(false)
    let zoneData = $derived(initializeZoneData());

    const groupStrengths = $derived({
        attackers: calculateGroupMatchup(team, opponent, 'attackers', opponentMode),
        midfielders: calculateGroupMatchup(team, opponent, 'midfielders', opponentMode),
        defenders: calculateGroupMatchup(team, opponent, 'defenders', opponentMode),
        keepers: calculateGroupMatchup(team, opponent, 'keepers', opponentMode)
    });

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
        for (const zone of ZONE_IDS) {
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

<div class="formation-layout">
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

        {#if resolvedMode !== 'select'}
            <!-- Zone overlays for strength visualization -->
            <div class="zone-overlays">
                {#each ZONE_IDS as zone}
                    {@const displayData = getZoneDisplay(zone)}
                    {@const rect = ZONE_LAYOUT[zone].rect}
                    {#if displayData && displayData.scores}
                        <div
                            class="zone-overlay"
                            style="left: {rect.left}; top: {rect.top}; width: {rect.width}; height: {rect.height}; background-color: {getZoneColor(displayData.strengthValue)}"
                        ></div>
                    {/if}
                {/each}
            </div>
        {/if}

        <!-- Conditional hover zones based on 'base' prop -->
        {#if resolvedMode === 'select'}
          <!-- Selection screen: unchanged, keeps its in-field FormationTab popups -->
          <div class="hover-zones">
            {#each GROUP_ROWS as row}
              <div
                role="presentation"
                onmouseenter={()=> setActiveTab(row.group)}
                onmouseleave={()=> setActiveTab(null)}
                class="hover-zone"
                style="top: {row.top}; height: {row.height};"
              >
                {#if activeTab === row.group}
                  <div class="tab-container">
                    <FormationTab group={row.group} scores={team.scores[row.scoreKey]} playerCount={playerCount(row.group)}/>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

        {:else if tabDisplay === 0}
          <!-- Preview: hovering only sets state; content renders in the side panel -->
          <div class="hover-zones">
            {#each GROUP_ROWS as row}
              <div
                role="presentation"
                onmouseenter={()=> setActiveTab(row.group)}
                class="hover-zone"
                class:is-active={activeTab === row.group}
                style="top: {row.top}; height: {row.height}; background-color: {getGroupStrengthColor(groupStrengths[row.group])};"
              ></div>
            {/each}
          </div>

        {:else if tabDisplay === 1}
          <!-- Zone-based hover zones -->
          <div class="hover-zones-detailed">
            {#each ZONE_IDS as zone}
              {@const layout = ZONE_LAYOUT[zone]}
              {#if zone !== KEEPER_ZONE || opponentMode !== 1}
                <div
                  role="presentation"
                  onmouseenter={()=> setActiveZone(zone)}
                  class="hover-zone-square"
                  class:is-active={activeZone === zone}
                  style="left: {layout.rect.left}; top: {layout.rect.top}; width: {layout.rect.width}; height: {layout.rect.height};"
                ></div>
              {/if}
            {/each}
          </div>
        {/if}

        {#each ZONE_IDS as zone (zone)}
            <FormationZone
                {zone}
                mode={resolvedMode}
                {team}
                {opponent}
                displayData={getZoneDisplay(zone)}
                {viewOpponent}
                {opponentMode}
                {focusedZone}
                {dropdownActive}
                zIndex={getZoneZIndex(zone)}
            />
        {/each}
    </div>

    {#if resolvedMode !== 'select'}
        <FormationDetailPanel
            {tabDisplay}
            activeGroup={activeTab}
            {activeZone}
            zoneDisplayData={activeZone != null ? getZoneDisplay(activeZone) : null}
            {team}
            {opponent}
            {opponentMode}
        />
    {/if}
</div>

<style>
    .field {
      position: relative;
      flex: 0 0 60%;
      height: 70rem;
      background: linear-gradient(#228B22, #006400);
      border: 4px solid #004d00;
      box-shadow: inset 0 0 30px #002200;
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
        /* background-color: transparent; */
        pointer-events: auto;
        transition: background-color 0.25s ease;
        overflow: visible;
    }
 
    .hover-zone:hover {
        background-color: rgba(255, 255, 255, 0.1);
        filter: brightness(1.1);
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

    .hover-zone.is-active,
    .hover-zone-square.is-active {
        background-color: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.35);
    }
   .tab-container {
       position: absolute;
       left: 100%;     
       top: 50%;       
       transform: translateY(-50%);
       pointer-events: auto;
   }

   .formation-layout {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
        width: 100%;
    }
 </style>