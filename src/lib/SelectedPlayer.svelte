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

<style>
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

    .attackers {
      background: #e63946;
    }
    .attackers.empty {
        background: #e7989fd5;
    }

    .midfielders {
      background: #f4a261;
    }
    .midfielders.empty {
        background: #e9aa77b9
    }

    .defenders {
      background: #2a9d8f;
    }
    .defenders.empty {
        background: #26e4ce59;
    }

    .keepers {
      background: #264653;
    }
    .keepers.empty {
        background: #73bcdaa1;
    }

    .default {
      background: #6c757d;
    }
    .default.empty {
      background: hsl(210, 5%, 47%);
    }

    .position {
      font-weight: 600;
      margin-right: 0.5rem;
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
</style>

<div class="tab {groupClass} {player.player_name ? '' : 'empty'}">
  <span class="position">{positionAbbrev(position)}</span>
  {#if player.player_name}
    <span class="name">{player.player_name}</span>
  {:else}
    <span class="name">No Player Selected</span>
  {/if}
</div>
