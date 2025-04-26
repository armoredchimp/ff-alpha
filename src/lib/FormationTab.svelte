<script>
  // Props for the tab: group label and score breakdown
  let {
    group = '',
    scores = {
      defense: 0,
      possession: 0,
      passing: 0,
      attacking: 0
    }
  } = $props();
</script>

<div class="formation-tab">
  <div class="tab-header">{group}</div>

  <!-- Metrics bar graph, styled inline per existing pattern -->
  <div class="tab-metrics">
    <div class="metric">
      <span class="metric-label">Def. Score</span>
      <div class="metric-bar-container">
        <div
          class="metric-bar bar-def"
          style="width: {((scores.defense / 5000) / 2) * 100}%"
        ></div>
      </div>
    </div>

    <div class="metric">
      <span class="metric-label">Poss. Score</span>
      <div class="metric-bar-container">
        <div
          class="metric-bar bar-poss"
          style="width: {((scores.possession / 5000) / 2) * 100}%"
        ></div>
      </div>
    </div>

    <div class="metric">
      <span class="metric-label">Pass. Score</span>
      <div class="metric-bar-container">
        <div
          class="metric-bar bar-pass"
          style="width: {((scores.passing / 5000) / 2 ) * 100}%"
        ></div>
      </div>
    </div>

    <div class="metric">
      <span class="metric-label">Att. Score</span>
      <div class="metric-bar-container">
        <div
          class="metric-bar bar-attk"
          style="width: {(( scores.attacking / 5000) / 2 ) * 100}%"
        ></div>
      </div>
    </div>
  </div>
</div>

<style>
  .formation-tab {
    position: absolute;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    width: 160px; /* slightly larger than player card */
    font-size: 0.8rem;
    pointer-events: none;
    z-index: 10;
  }

  .tab-header {
    font-weight: bold;
    text-transform: capitalize;
    color: #333;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .tab-metrics {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric {
    display: flex;
    align-items: center;
  }

  .metric-label {
    flex: 0 0 6rem;
    color: #555;
    font-size: 0.75rem;
  }

  .metric-bar-container {
    flex: 1;
    height: 0.5rem;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
  }

  .metric-bar {
    height: 100%;
  }
  .bar-def  { background-color: #e74c3c; }
  .bar-poss { background-color: #3498db; }
  .bar-pass { background-color: #2ecc71; }
  .bar-attk { background-color: #f1c40f; }
</style>