<script lang="ts">
    import ScoreBars from './ScoreBars.svelte';
    import { normalizeTeamScores, TEAM_SCORE_KEYS } from './data/scoreConfig';

    interface ScoresProps {
        finishing: number;
        attacking: number;
        passing: number;
        possession: number;
        defense: number;
        keeping: number;
    }

    let {
        scores = {
            finishing: 0,
            attacking: 0,
            passing: 0,
            possession: 0,
            defense: 0,
            keeping: 0
        },
        playerCount = 1,
        keeperCount = 1
    }: {
        scores?: ScoresProps;
        playerCount?: number;
        keeperCount?: number;
    } = $props();

    // Defence-up presentation, the inverse of the popup's attack-first order.
    const keys = [...TEAM_SCORE_KEYS]

    const normalized = $derived(normalizeTeamScores(scores, playerCount, keeperCount));
</script>

<div class="team-scores-container">
    <h3 class="team-scores-title">Team Ratings</h3>
    <ScoreBars
        scores={normalized}
        {keys}
        variant="stacked"
        size="large"
        showValues
        decimals={2}
    />
</div>

<style>
    .team-scores-container {
        background: #ffffff;
        border-radius: 10px;
        padding: 1.5rem;
        max-width: 600px;
        margin: 1rem auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
    }

    .team-scores-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1rem;
        text-align: left;
        border-bottom: 1px solid #f3f4f6;
        padding-bottom: 0.5rem;
    }
</style>