<script lang="ts">
    interface ScoresProps {
        attacking: number;
        passing: number;
        possession: number;
        defense: number;
        keeping: number;
    }

    type StatLabel = 'Keeping' | 'Defending' | 'Possession' | 'Passing' | 'Attacking';

    interface StatItem {
        label: StatLabel;
        value: number;
    }

    let {
        scores = {
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

    const maxScore = 5000;

    let atk = $derived(scores.attacking / playerCount);
    let pas = $derived(scores.passing / playerCount);
    let pos = $derived(scores.possession / playerCount);
    let def = $derived(scores.defense / playerCount);
    let kep = $derived(scores.keeping ? scores.keeping / keeperCount : 0);

    const percent = (score: number): string => `${Math.min(100, (score / maxScore) * 100)}%`;

    const barColors: Record<StatLabel, string> = {
        Attacking: 'attacking-bar',
        Passing: 'passing-bar',
        Possession: 'possession-bar',
        Defending: 'defending-bar',
        Keeping: 'keeping-bar'
    };
</script>

<div class="team-scores-container">
    <h3 class="team-scores-title">Team Ratings</h3>

    <div class="scores-grid">
        {#each [
            { label: 'Keeping', value: kep },
            { label: 'Defending', value: def },
            { label: 'Possession', value: pos },
            { label: 'Passing', value: pas },
            { label: 'Attacking', value: atk },
        ] as stat}
            <div class="score-item">
                <div class="score-label">
                    <span>{stat.label}</span>
                    <span class="score-value">{stat.value.toFixed(2)}</span>
                </div>
                <div class="progress-bar-container">
                    <div
                        class={`progress-bar ${barColors[stat.label as StatLabel]}`}
                        style={`width: ${percent(stat.value)}`}
                    ></div>
                </div>
            </div>
        {/each}
    </div>
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

    .scores-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .score-item {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .score-label {
        display: flex;
        justify-content: space-between;
        font-size: 0.95rem;
        color: #374151;
    }

    .score-value {
        font-weight: 600;
        color: #1f2937;
    }

    .progress-bar-container {
        width: 100%;
        height: 10px;
        background: #f3f4f6;
        border-radius: 5px;
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        transition: width 0.3s ease-in-out;
    }

    /* Muted, professional tones */
    .attacking-bar {
        background-color: #fca5a5; /* soft red */
    }

    .passing-bar {
        background-color: #93c5fd; /* soft blue */
    }

    .possession-bar {
        background-color: #6ee7b7; /* soft green */
    }

    .defending-bar {
        background-color: #fde68a; /* soft yellow */
    }

    .keeping-bar {
        background-color: #a074cf; /* soft violet */
    }
</style>