<script>
    let {
      team = {}
      } = $props();

    import FormationPlayer from "./FormationPlayer.svelte";
  
    // Helper: Returns an array of formation slots for the given zone.
    // Each slot is generated based on the "max" value,
    // and if a player isn't available for that slot, player is set to null.
    function getSlotsByZone(zone) {
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
  </script>
  
  <div class="field">
    <!-- Attacker Row (Row 6, Top: Zones 15, 16, 17) -->
    {#if getSlotsByZone(15).length}
      <div class="zone zone-15">
        {#each getSlotsByZone(15) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(16).length}
      <div class="zone zone-16">
        {#each getSlotsByZone(16) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(17).length}
      <div class="zone zone-17">
        {#each getSlotsByZone(17) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
  
    <!-- AM/Winger Row (Row 5: Zones 12, 13, 14) -->
    {#if getSlotsByZone(12).length}
      <div class="zone zone-12">
        {#each getSlotsByZone(12) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(13).length}
      <div class="zone zone-13">
        {#each getSlotsByZone(13) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(14).length}
      <div class="zone zone-14">
        {#each getSlotsByZone(14) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
  
    <!-- Central Midfield Row (Row 4: Zones 9, 10, 11) -->
    {#if getSlotsByZone(9).length}
      <div class="zone zone-9">
        {#each getSlotsByZone(9) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(10).length}
      <div class="zone zone-10">
        {#each getSlotsByZone(10) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(11).length}
      <div class="zone zone-11">
        {#each getSlotsByZone(11) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
  
    <!-- Wing Back / DM Row (Row 3: Zones 6, 7, 8) -->
    {#if getSlotsByZone(6).length}
      <div class="zone zone-6">
        {#each getSlotsByZone(6) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(7).length}
      <div class="zone zone-7">
        {#each getSlotsByZone(7) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(8).length}
      <div class="zone zone-8">
        {#each getSlotsByZone(8) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
  
    <!-- Defender Row (Row 2: Zones 3, 4, 5) -->
    {#if getSlotsByZone(3).length}
      <div class="zone zone-3">
        {#each getSlotsByZone(3) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(4).length}
      <div class="zone zone-4">
        {#each getSlotsByZone(4) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
    {#if getSlotsByZone(5).length}
      <div class="zone zone-5">
        {#each getSlotsByZone(5) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
      </div>
    {/if}
  
    <!-- Keeper Row (Row 1, Bottom: Zone 1) -->
    {#if getSlotsByZone(1).length}
      <div class="zone zone-1">
        {#each getSlotsByZone(1) as slot, i (slot.currentPosition + '-' + i)}
          <FormationPlayer player={slot.player} currentPosition={slot.currentPosition} />
        {/each}
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
    }
    
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
  </style>
  