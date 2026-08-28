<script lang="ts">
    import { positionAbbrev } from './utils';
    import { playerScores } from './data/scoreConfig';
    import ScoreBars from './ScoreBars.svelte';

    let {
        player = {},
        position = '',
        posGroup = ''
    } = $props();

    const validGroups = ['attackers', 'midfielders', 'defenders', 'keepers', 'subs'];
    const groupClass = $derived(validGroups.includes(posGroup) ? posGroup : 'default');

    const displayPosition = $derived(
        posGroup === 'unused' && player?.injured?.category
            ? (player.injured.category === 'injury' ? 'Injured' : 'Suspended')
            : position
    );

    const isKeeper = $derived(player?.detailed_position === 'Goalkeeper');
</script>


<div class="wrapper">
  <div class="tab 
    {groupClass} 
    {player?.player_name ? '' : 'empty'} 
    {player?.injured?.category === 'injury' ? 'injured' : ''} 
    {player?.injured?.category === 'suspended' ? 'suspended' : ''}">
    <span class="position">{positionAbbrev(displayPosition)}</span>
    {#if player?.player_name}
      <span class="name">
        <a href={`../player/${player.id}`}>
        {player.player_name}
        </a>
      </span>
    {:else}
      <span class="name">No Player Selected</span>
    {/if}
  </div>

  {#if player?.player_name}
    <div class="player-popup">
      <div><strong>{player.player_name}</strong></div>
      <div>{player.player_team || 'Unknown'}</div>
      <div><strong>Nationality:</strong> {player.nationality || 'Unknown'}</div>
      <div><strong>Position:</strong> {positionAbbrev(player.detailed_position || '')}</div>
      <div><strong>Age:</strong> {player.player_age || 'Unknown'} yrs</div>

      <div class="player-metrics">
        <ScoreBars scores={playerScores(player)} {isKeeper} variant="stacked" />
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

  .subs { background: #ac8439; }
  .subs.empty { background: #f0d199;}

  .default { background: #6c757d; }
  .default.empty { background: hsl(210, 5%, 47%); }

  .injured { background: #8b0000 !important; }
  .suspended { background: #c5a800 !important; }

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
</style>