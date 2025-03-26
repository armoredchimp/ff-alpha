<script>
    let {
        ticker = {
            currentRound: 1,
            currentPick: 1,
            currentTeam: '',
            nextTeam: ''
        }
    } = $props()
</script>

<div class="draft-ticker">
    <div class="ticker-main">
        <div class="ticker-section">
            <span class="label">Round</span>
            <span class="value">{ticker.currentRound}</span>
        </div>
        <div class="ticker-divider"></div>
        <div class="ticker-section">
            <span class="label">Pick</span>
            <span class="value">{ticker.currentPick}</span>
        </div>
        <div class="ticker-divider"></div>
        <div class="ticker-section">
            <span class="label">On the Clock</span>
            <span class="value">{ticker.currentTeam}</span>
        </div>
        <div class="next-team">
            <span class="next-label">Next: {ticker.nextTeam}</span>
        </div>
    </div>
</div>

<style>
    .draft-ticker {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.75rem 1.5rem;
        margin-bottom: 1rem;
        width: fit-content;
        min-width: 600px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .ticker-main {
        display: flex;
        align-items: center;
        gap: 1rem;
        height: 2.5rem;
    }

    .ticker-section {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    .ticker-divider {
        height: 24px;
        width: 1px;
        background-color: #e2e8f0;
    }

    .label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: 1;
    }

    .value {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1e293b;
        line-height: 1;
        margin-top: 0.25rem;
    }

    .next-team {
        margin-left: auto;
        padding-left: 1rem;
    }

    .next-label {
        font-size: 0.75rem;
        color: #94a3b8;
    }
</style>