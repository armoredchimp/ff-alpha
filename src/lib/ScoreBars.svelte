<script lang="ts">
    import { SCORE_CONFIG, normalizeScores, scoreKeysFor, MAX_SCORE } from './data/scoreConfig';
    import type { ScoreKey } from './data/scoreConfig';

    // variant: 'inline'  → label beside the bar
    //          'stacked' → label (and value) above a full-width bar
    // size:    'compact' | 'default' | 'large'
    // keys:    explicit key order; overrides the isKeeper default
    let {
        scores = null as Record<string, any> | null,
        isKeeper = false,
        variant = 'inline' as 'inline' | 'stacked',
        size = 'default' as 'compact' | 'default' | 'large',
        keys: keysProp = null as ScoreKey[] | null,
        labels = 'full' as 'full' | 'abbrev',
        showValues = false,
        decimals = 0,
        max = MAX_SCORE
    } = $props<{
        scores?: Record<string, any> | null;
        isKeeper?: boolean;
        variant?: 'inline' | 'stacked';
        size?: 'compact' | 'default' | 'large';
        keys?: ScoreKey[] | null;
        labels?: 'full' | 'abbrev';
        showValues?: boolean;
        decimals?: number;
        max?: number;
    }>();

    const normalized = $derived(normalizeScores(scores));
    const resolvedKeys = $derived(keysProp ?? scoreKeysFor(isKeeper));

    function width(val: number | undefined): string {
        if (val == null) return '0%';
        return `${Math.max(0, Math.min((val / max) * 100, 100))}%`;
    }
</script>

<div
    class="score-bars {variant} {size}"
    class:abbrev={labels === 'abbrev'}
    class:has-values={showValues}
>
    {#each resolvedKeys as key}
        {@const cfg = SCORE_CONFIG[key]}
        {@const val = normalized[key] ?? 0}
        <div class="bar-row">
            <span class="bar-label">{labels === 'abbrev' ? cfg.abbrev : cfg.label}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width: {width(val)}; background: {cfg.color};"></div>
            </div>
            {#if showValues}
                <span class="bar-value">{val.toFixed(decimals)}</span>
            {/if}
        </div>
    {/each}
</div>

<style>
    .score-bars {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 100%;
    }

    /* Grid rather than flex so the same markup order serves both variants:
       inline puts the value after the track, stacked lifts it onto the
       label row and spans the track beneath. */
    .bar-row {
        display: grid;
        align-items: center;
    }

    .bar-label { grid-area: label; }
    .bar-track { grid-area: track; }
    .bar-value { grid-area: value; }

    .inline .bar-row {
        grid-template-columns: auto 1fr;
        grid-template-areas: "label track";
        column-gap: 0.4rem;
    }

    .inline.has-values .bar-row {
        grid-template-columns: auto 1fr auto;
        grid-template-areas: "label track value";
    }

    .stacked .bar-row {
        grid-template-columns: 1fr;
        grid-template-areas: "label" "track";
        row-gap: 0.15rem;
    }

    .stacked.has-values .bar-row {
        grid-template-columns: 1fr auto;
        grid-template-areas:
            "label value"
            "track track";
        column-gap: 0.5rem;
    }

    .bar-label {
        font-size: 0.7rem;
        color: #64748b;
        min-width: 4.5rem;
        text-align: right;
    }

    .bar-track {
        height: 7px;
        background: #f1f5f9;
        border-radius: 4px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .bar-value {
        font-weight: 600;
        font-size: 0.75rem;
        color: #374151;
        text-align: right;
    }

    /* --- stacked: labels read left-to-right, track spans full width --- */
    .stacked .bar-label {
        min-width: 0;
        text-align: left;
        color: inherit;
    }

    /* --- abbrev: 3-letter codes are uniform, so a fixed column keeps
           every bar left-aligned with each other --- */
    .abbrev .bar-label {
        min-width: 2rem;
        text-align: left;
        font-weight: 600;
        color: #6b7280;
    }

    /* --- sizes --- */
    .compact .bar-label {
        min-width: 3.5rem;
        font-size: 0.6rem;
    }

    .compact .bar-track {
        height: 5px;
    }

    .large {
        gap: 1rem;
    }

    .large .bar-row {
        row-gap: 0.4rem;
    }

    .large .bar-label {
        font-size: 0.95rem;
        color: #374151;
    }

    .large .bar-value {
        font-size: 0.95rem;
        color: #1f2937;
    }

    .large .bar-track {
        height: 10px;
        border-radius: 5px;
        background: #f3f4f6;
    }
</style>