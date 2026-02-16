<script lang="ts">
    import { teamIdsToName, playersByID } from "./stores/generic.svelte";
    import { getPossessionColor, getPossessionPercentage} from "./utils/team.ts"
    import type { Team } from "./types/types";

    let {
        goalDetails = {} as JSON,
        chanceBreakdown = {} as JSON,
        posBreakdown = {} as JSON,
        isHome = false as boolean,
        team = {} as Team,
    } = $props<{
        goalDetails?: JSON;
        chanceBreakdown?: JSON;
        posBreakdown?: JSON;
        isHome?: boolean;
        team?: Team | null;
    }>();

    let teamSide = $derived(isHome ? 'home' : 'away');
    let oppSide = $derived(isHome ? 'away' : 'home');

    let teamGoals = $derived(goalDetails?.[teamSide] || []);
    let oppGoals = $derived(goalDetails?.[oppSide] || []);

    let oppName = $derived(teamIdsToName[team.lastResult.oppId] || 'Opponent');

    function getInsightColor(side: 'ours' | 'theirs', level: number): string {
        // level 1 = lightest, 4 = most intense
        const blueShades = ['#bfdbfe', '#93b5f5', '#5b8def', '#2563eb'];
        const redShades = ['#fecaca', '#f5a3a3', '#ef7171', '#dc2626'];
        const shades = side === 'ours' ? blueShades : redShades;
        return shades[Math.min(level - 1, 3)];
    }

    // Possession breakdown analysis
    interface PosInsight {
        text: string;
        side: 'ours' | 'theirs';
    }

    let posInsights = $derived.by(() => {
        if (!posBreakdown) return [];
        const ours = posBreakdown[teamSide];
        const theirs = posBreakdown[oppSide];
        if (!ours || !theirs) return [];

        const insights: { text: string; side: 'ours' | 'theirs'; level: number }[] = [];

        const midDiff = ours.byGroup.midfielders - theirs.byGroup.midfielders;
        if (midDiff >= 6) {
            insights.push({ text: `${team.name}'s midfielders dominated the possession battle`, side: 'ours', level: 4 });
        } else if (midDiff >= 3) {
            insights.push({ text: `${team.name}'s midfielders won the midfield possession battle`, side: 'ours', level: 3 });
        } else if (midDiff <= -6) {
            insights.push({ text: `${oppName}'s midfielders dominated the possession battle`, side: 'theirs', level: 4 });
        } else if (midDiff <= -3) {
            insights.push({ text: `${oppName}'s midfielders won the midfield possession battle`, side: 'theirs', level: 3 });
        }

        const atkDiff = ours.byGroup.attackers - theirs.byGroup.attackers;
        if (atkDiff >= 6) {
            insights.push({ text: `${team.name}'s attackers controlled possession in the final third`, side: 'ours', level: 4 });
        } else if (atkDiff >= 3) {
            insights.push({ text: `${team.name}'s attackers held possession well in advanced areas`, side: 'ours', level: 3 });
        } else if (atkDiff <= -6) {
            insights.push({ text: `${oppName}'s attackers controlled possession in the final third`, side: 'theirs', level: 4 });
        } else if (atkDiff <= -3) {
            insights.push({ text: `${oppName}'s attackers held possession well in advanced areas`, side: 'theirs', level: 3 });
        }

        const defDiff = ours.byGroup.defenders - theirs.byGroup.defenders;
        if (defDiff >= 6) {
            insights.push({ text: `${team.name}'s defenders retained possession comfortably from the back`, side: 'ours', level: 4 });
        } else if (defDiff >= 3) {
            insights.push({ text: `${team.name}'s defenders retained possession well`, side: 'ours', level: 3 });
        } else if (defDiff <= -6) {
            insights.push({ text: `${oppName}'s defenders retained possession comfortably from the back`, side: 'theirs', level: 4 });
        } else if (defDiff <= -3) {
            insights.push({ text: `${oppName}'s defenders retained possession well`, side: 'theirs', level: 3 });
        }

        return insights;
    });

    // Overall possession percentage
    let overallPossPct = $derived.by(() => {
        if (!posBreakdown) return null;
        const ours = posBreakdown[teamSide]?.total ?? 0;
        const theirs = posBreakdown[oppSide]?.total ?? 0;
        return getPossessionPercentage(ours, theirs);
    });

    let overallPossColor = $derived(overallPossPct ? getPossessionColor(overallPossPct) : '');

    // Chance creation insights
    function getChanceInsight(teamName: string, group: string, val: number): { text: string; level: number } | null {
        if (group === 'attackers') {
            if (val <= 12) return { text: `${teamName}'s attackers created very little`, level: 1 };
            if (val <= 25) return { text: `${teamName}'s attackers generated a moderate number of chances`, level: 2 };
            if (val <= 40) return { text: `${teamName}'s attackers were a constant threat`, level: 3 };
            return { text: `${teamName}'s attackers were relentless in chance creation`, level: 4 };
        }
        if (group === 'midfielders') {
            if (val <= 12) return { text: `${teamName}'s midfielders offered little going forward`, level: 1 };
            if (val <= 25) return { text: `${teamName}'s midfielders contributed some chances`, level: 2 };
            if (val <= 40) return { text: `${teamName}'s midfielders drove a lot of the attacking play`, level: 3 };
            return { text: `${teamName}'s midfielders were the engine of the attack`, level: 4 };
        }
        if (group === 'defenders') {
            if (val <= 12) return null;
            if (val <= 25) return { text: `${teamName}'s defenders chipped in with some chances`, level: 2 };
            if (val <= 40) return { text: `${teamName}'s defenders were surprisingly productive going forward`, level: 3 };
            return { text: `${teamName}'s defenders were a major source of chance creation`, level: 4 };
        }
        return null;
    }

    let chanceInsights = $derived.by(() => {
        if (!chanceBreakdown) return [];
        const ours = chanceBreakdown[teamSide];
        const theirs = chanceBreakdown[oppSide];
        if (!ours || !theirs) return [];

        const results: { text: string; side: 'ours' | 'theirs'; level: number }[] = [];

        for (const [side, data, name] of [['ours', ours, team.name], ['theirs', theirs, oppName]] as const) {
            let best: { text: string; level: number } | null = null;

            for (const group of ['attackers', 'midfielders', 'defenders'] as const) {
                const result = getChanceInsight(name, group, data.byGroup[group]);
                if (result && (!best || result.level > best.level)) {
                    best = result;
                }
            }

            if (best && best.level >= 2) {
                results.push({ ...best, side });
            } else {
                results.push({
                    text: `${name} struggled to create meaningful chances throughout the match`,
                    side,
                    level: 1,
                });
            }
        }

        return results;
    });
</script>

<div class="match-container">
  <div class="score-header">
    <div class="team-name ours">{team.name}</div>
    <div class="score">
      {team.lastResult.goalsFor} - {team.lastResult.goalsAgainst}
    </div>
    <div class="team-name theirs">{oppName}</div>
  </div>

  <div class="goals-section">
    {#if teamGoals.length > 0}
      <div class="goals-column ours">
        {#each teamGoals as goal}
          <div class="goal-entry">
            <div class="goal-main">
              <span class="minute">{goal.minute}'</span>
              <span class="scorer">{goal.scorerName}</span>
            </div>
            {#if goal.assister}
              {@const assister = playersByID[goal.assister]}
              <span class="assister">Assist: {assister.player_name}</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="goals-column ours empty">No goals</div>
    {/if}

    {#if oppGoals.length > 0}
      <div class="goals-column theirs">
        {#each oppGoals as goal}
          <div class="goal-entry">
            <div class="goal-main">
              <span class="scorer">{goal.scorerName}</span>
              <span class="minute">{goal.minute}'</span>
            </div>
            {#if goal.assister}
              {@const assister = playersByID[goal.assister]}
              <span class="assister">Assist: {assister.player_name}</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="goals-column theirs empty">No goals</div>
    {/if}
  </div>

  {#if posInsights.length > 0}
    <div class="pos-insights">
      <span class="section-label">Possession</span>
      {#each posInsights as insight}
        <div class="pos-insight" style="color: {getInsightColor(insight.side, insight.level)};">
          <span class="pos-dot" style="background: {getInsightColor(insight.side, 4)};"></span>
          {insight.text}
        </div>
      {/each}
    </div>
  {/if}

  {#if chanceInsights.length > 0}
    <div class="pos-insights">
      <span class="section-label">Chance Creation</span>
      {#each chanceInsights as insight}
        <div class="pos-insight" style="color: {getInsightColor(insight.side, insight.level)};">
          <span class="pos-dot" style="background: {getInsightColor(insight.side, 4)};"></span>
          {insight.text}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .match-container {
    max-width: 500px;
    margin: 1rem auto;
    padding: 1.5rem;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 1rem;
  }

  .team-name {
    font-weight: 600;
    font-size: 1.1rem;
    flex: 1;
  }

  .team-name.ours { 
    text-align: left; 
    color: #2563eb; 
  }

  .team-name.theirs { 
    text-align: right; 
    color: #dc2626; 
  }

  .score {
    font-size: 1.75rem;
    font-weight: 700;
    padding: 0 1.5rem;
  }

  .goals-section {
    display: flex;
    gap: 1rem;
  }

  .goals-column {
    flex: 1;
  }

  .goals-column.theirs {
    text-align: right;
  }

  .goals-column.empty {
    color: #a0aec0;
    font-style: italic;
    padding: 0.5rem 0;
  }

  .goal-entry {
    display: flex;
    flex-direction: column;
    padding: 0.35rem 0;
  }

  .goal-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .goals-column.theirs .goal-main {
    justify-content: flex-end;
  }

  .minute {
    font-weight: 600;
    color: #718096;
    font-size: 0.85rem;
    min-width: 2rem;
  }

  .scorer {
    font-weight: 500;
  }

  .assister {
    font-size: 0.8rem;
    margin-left: 2.5rem;
  }

  .goals-column.theirs .assister {
    margin-left: 0;
    margin-right: 2.5rem;
  }

  .goals-column.ours .scorer { color: #2563eb; }
  .goals-column.theirs .scorer { color: #dc2626; }
  .goals-column.ours .assister { color: #93b5f5; }
  .goals-column.theirs .assister { color: #f5a3a3; }

  .possession-bar-section {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .poss-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 0.4rem;
  }

  .poss-bar-track {
    height: 8px;
    background: #fee2e2;
    border-radius: 4px;
    overflow: hidden;
  }

  .poss-bar-fill.ours {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .poss-numbers {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
  }

  .poss-num {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .pos-insights {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .pos-insight {
    font-size: 0.82rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pos-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #a0aec0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>