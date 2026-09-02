<script lang="ts">
    import { playersByID, getPlayerTeamName } from "./stores/generic.svelte";
    import { getTeamByDbId } from "./stores/teams.svelte";
    import { getPossessionColor, getPossessionPercentage } from "./utils/team";

    // Bundle-sourced, neutral framing: match (match_results row) + details
    // (match_details row). No "ours/theirs" — everything is home vs away.
    let {
        match = {} as any,
        details = {} as any
    } = $props<{
        match?: any;
        details?: any;
    }>();

    const playerTeamName = getPlayerTeamName()
    function teamHref(name: string): string {
        return name === playerTeamName ? '/teams/player/main' : `/teams/${name}`;
    }

    const goalDetails = $derived(details?.goal_details ?? {});
    const chanceBreakdown = $derived(details?.chance_breakdown ?? {});
    const posBreakdown = $derived(details?.possession_breakdown ?? {});

    const homeName = $derived(getTeamByDbId(match?.home_team_id)?.name ?? 'Home');
    const awayName = $derived(getTeamByDbId(match?.away_team_id)?.name ?? 'Away');

    const homeGoals = $derived(goalDetails?.home || []);
    const awayGoals = $derived(goalDetails?.away || []);

    // Home = blue, away = red — matches the page's side labels and app palette.
    function getInsightColor(side: 'home' | 'away', level: number): string {
        const blueShades = ['#bfdbfe', '#93b5f5', '#5b8def', '#2563eb'];
        const redShades = ['#fecaca', '#f5a3a3', '#ef7171', '#dc2626'];
        const shades = side === 'home' ? blueShades : redShades;
        return shades[Math.min(level - 1, 3)];
    }

    // ---- Possession insights (home vs away) ----
    let posInsights = $derived.by(() => {
        if (!posBreakdown) return [];
        const home = posBreakdown.home;
        const away = posBreakdown.away;
        if (!home || !away) return [];

        const insights: { team: string; text: string; side: 'home' | 'away'; level: number }[] = [];

        const groups: { key: 'midfielders' | 'attackers' | 'defenders'; hi: string; lo: string }[] = [
            { key: 'midfielders', hi: 'dominated the possession battle', lo: 'won the midfield possession battle' },
            { key: 'attackers', hi: 'controlled possession in the final third', lo: 'held possession well in advanced areas' },
            { key: 'defenders', hi: 'retained possession comfortably from the back', lo: 'retained possession well' }
        ];

        for (const g of groups) {
            const diff = home.byGroup[g.key] - away.byGroup[g.key];
            if (diff >= 6) insights.push({ team: homeName, text: `'s ${g.key} ${g.hi}`, side: 'home', level: 4 });
            else if (diff >= 3) insights.push({ team: homeName, text: `'s ${g.key} ${g.lo}`, side: 'home', level: 3 });
            else if (diff <= -6) insights.push({ team: awayName, text: `'s ${g.key} ${g.hi}`, side: 'away', level: 4 });
            else if (diff <= -3) insights.push({ team: awayName, text: `'s ${g.key} ${g.lo}`, side: 'away', level: 3 });
        }

        return insights;
    });

    // ---- Chance creation insights ----
    function getChanceInsight(group: string, val: number): { text: string; level: number } | null {
        if (group === 'attackers') {
            if (val <= 12) return { text: `'s attackers created very little`, level: 1 };
            if (val <= 25) return { text: `'s attackers generated a moderate number of chances`, level: 2 };
            if (val <= 40) return { text: `'s attackers were a constant threat`, level: 3 };
            return { text: `'s attackers were relentless in chance creation`, level: 4 };
        }
        if (group === 'midfielders') {
            if (val <= 12) return { text: `'s midfielders offered little going forward`, level: 1 };
            if (val <= 25) return { text: `'s midfielders contributed some chances`, level: 2 };
            if (val <= 40) return { text: `'s midfielders drove a lot of the attacking play`, level: 3 };
            return { text: `'s midfielders were the engine of the attack`, level: 4 };
        }
        if (group === 'defenders') {
            if (val <= 12) return null;
            if (val <= 25) return { text: `'s defenders chipped in with some chances`, level: 2 };
            if (val <= 40) return { text: `'s defenders were surprisingly productive going forward`, level: 3 };
            return { text: `'s defenders were a major source of chance creation`, level: 4 };
        }
        return null;
    }

    let chanceInsights = $derived.by(() => {
        if (!chanceBreakdown) return [];
        const home = chanceBreakdown.home;
        const away = chanceBreakdown.away;
        if (!home || !away) return [];

        const results: { team: string; text: string; side: 'home' | 'away'; level: number }[] = [];

        for (const [side, dataObj, name] of [['home', home, homeName], ['away', away, awayName]] as const) {
            let best: { text: string; level: number } | null = null;
            for (const group of ['attackers', 'midfielders', 'defenders'] as const) {
                const r = getChanceInsight(group, dataObj.byGroup[group]);
                if (r && (!best || r.level > best.level)) best = r;
            }
            if (best && best.level >= 2) {
                results.push({ ...best, team: name, side });
            } else {
                results.push({
                    team: name,
                    text: ` struggled to create meaningful chances throughout the match`,
                    side,
                    level: 1
                });
            }
        }

        return results;
    });
</script>

<div class="match-container">
    <div class="score-header">
        <div class="team-name home"><a href={teamHref(homeName)}>{homeName}</a></div>
        <div class="score">
            {match?.home_score ?? 0} - {match?.away_score ?? 0}
        </div>
        <div class="team-name away"><a href={teamHref(awayName)}>{awayName}</a></div>
    </div>

    <div class="goals-section">
        {#if homeGoals.length > 0}
            <div class="goals-column home">
                {#each homeGoals as goal}
                    <div class="goal-entry">
                        <div class="goal-main">
                            <span class="minute">{goal.minute}'</span>
                            <span class="scorer">
                                {#if goal.scorerPlayerId}
                                    <a href={`/player/${goal.scorerPlayerId}`}>{goal.scorerName}</a>
                                {:else}
                                    {goal.scorerName}
                                {/if}
                            </span>
                        </div>
                        {#if goal.assister}
                            {@const assister = playersByID[goal.assister]}
                            <span class="assister">
                                Assist: <a href={`/player/${goal.assister}`}>{assister?.player_name}</a>
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div class="goals-column home empty">No goals</div>
        {/if}

        {#if awayGoals.length > 0}
            <div class="goals-column away">
                {#each awayGoals as goal}
                    <div class="goal-entry">
                        <div class="goal-main">
                            <span class="scorer">
                                {#if goal.scorerPlayerId}
                                    <a href={`/player/${goal.scorerPlayerId}`}>{goal.scorerName}</a>
                                {:else}
                                    {goal.scorerName}
                                {/if}
                            </span>
                            <span class="minute">{goal.minute}'</span>
                        </div>
                        {#if goal.assister}
                            {@const assister = playersByID[goal.assister]}
                            <span class="assister">
                                Assist: <a href={`/player/${goal.assister}`}>{assister?.player_name}</a>
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div class="goals-column away empty">No goals</div>
        {/if}
    </div>

    {#if posInsights.length > 0}
        <div class="pos-insights">
            <span class="section-label">Possession</span>
                {#each posInsights as insight}
                    <div class="pos-insight" style="color: {getInsightColor(insight.side, insight.level)};">
                        <span class="pos-dot" style="background: {getInsightColor(insight.side, 4)};"></span>
                        <span><a href={teamHref(insight.team)}>{insight.team}</a>{insight.text}</span>
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
                        <span><a href={teamHref(insight.team)}>{insight.team}</a>{insight.text}</span>
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
 
    .team-name.home {
        text-align: left;
        color: #2563eb;
    }
 
    .team-name.away {
        text-align: right;
        color: #dc2626;
    }
 
    .team-name a,
    .scorer a,
    .assister a,
    .pos-insight a {
        color: inherit;
        text-decoration: none;
    }

    .team-name a:hover,
    .scorer a:hover,
    .assister a:hover,
    .pos-insight a:hover {
        text-decoration: underline;
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
 
    .goals-column.away {
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
 
    .goals-column.away .goal-main {
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
 
    .goals-column.away .assister {
        margin-left: 0;
        margin-right: 2.5rem;
    }
 
    .goals-column.home .scorer { color: #2563eb; }
    .goals-column.away .scorer { color: #dc2626; }
    .goals-column.home .assister { color: #93b5f5; }
    .goals-column.away .assister { color: #f5a3a3; }
 
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
