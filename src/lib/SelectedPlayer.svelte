<script>
    import { positionAbbrev } from './utils/utils';

    let {
        player = {},
        position = '',
        posGroup = ''
    } = $props();

    const validGroups = ['attackers', 'midfielders', 'defenders', 'keepers'];
    const groupClass = validGroups.includes(posGroup) ? posGroup : 'default';
</script>


<div class="wrapper">
  <div class="tab {groupClass} {player.player_name ? '' : 'empty'}">
    <span class="position">{positionAbbrev(position)}</span>
    {#if player.player_name}
      <span class="name">{player.player_name}</span>
    {:else}
      <span class="name">No Player Selected</span>
    {/if}
  </div>

  {#if player.player_name && player.detailed_position !== "Goalkeeper"}
    <div class="player-popup">
      <div><strong>{player.player_name}</strong></div>
      <div><strong>Nationality:</strong> {player.nationality}</div>
      <div><strong>Position:</strong> {positionAbbrev(player.detailed_position)}</div>
      <div><strong>Age:</strong> {player.player_age} yrs</div>

      <div class="player-metrics">
        <div class="metric">
          <span class="metric-label">Defense</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-def"
              style="width: {(player.defensive_score / 5000) * 100}%"
            ></div>
          </div>
        </div>

        <div class="metric">
          <span class="metric-label">Possession</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-poss"
              style="width: {(player.possession_score / 5000) * 100}%"
            ></div>
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
          <span class="metric-label">Attacking</span>
          <div class="metric-bar-container">
            <div
              class="metric-bar bar-attk"
              style="width: {(player.attacking_score / 5000) * 100}%"
            ></div>
          </div>
        </div>
      </div>
    </div>
  {:else if player.detailed_position === "Goalkeeper"}
  <div class="player-popup">
    <div><strong>{player.player_name}</strong></div>
    <div><strong>Nationality:</strong> {player.nationality}</div>
    <div><strong>Position:</strong> {positionAbbrev(player.detailed_position)}</div>
    <div><strong>Age:</strong> {player.player_age} yrs</div>

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
</div>

<style>
  .wrapper {
    position: relative;
    display: inline-block;
  }

  .tab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 12px;
    padding: 0.5rem 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    min-width: 140px;
    color: #ffffff;
  }

  .attackers { background: #e63946; }
  .attackers.empty { background: #e7989fd5; }

  .midfielders { background: #f4a261; }
  .midfielders.empty { background: #e9aa77b9; }

  .defenders { background: #2a9d8f; }
  .defenders.empty { background: #26e4ce59; }

  .keepers { background: #264653; }
  .keepers.empty { background: #73bcdaa1; }

  .default { background: #6c757d; }
  .default.empty { background: hsl(210, 5%, 47%); }

  .position {
    font-weight: 600;
    margin-right: 0.5rem;
  }

  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-popup {
    display: none;
    position: absolute;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    margin-right: 0.5rem;
    width: 12rem;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    text-align: left;
    white-space: nowrap;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .wrapper:hover .player-popup {
    display: block;
    opacity: 1;
  }


  .player-metrics {
    margin-top: 0.5rem;
  }

  .metric {
    margin-bottom: 0.25rem;
  }

  .metric-label {
    font-size: 0.7rem;
    margin-right: 0.25rem;
  }

  .metric-bar-container {
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    height: 0.5rem;
    margin-top: 0.15rem;
  }

  .metric-bar {
    height: 100%;
  }

  .bar-def { background: #e63946; }
  .bar-poss { background: #f4a261; }
  .bar-pass { background: #2a9d8f; }
  .bar-attk { background: #264653; }
</style>