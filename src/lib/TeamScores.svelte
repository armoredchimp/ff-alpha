<script>
    let {
        scores = {
            attacking: 0,
            passing: 0,
            possession: 0,
            defending: 0,
            keeping: 0
        }
    } = $props();
</script>

<div class="team-scores-container">
    <h3 class="team-scores-title">Team Ratings</h3>
    
    <div class="scores-grid">
        <!-- Attacking -->
        <div class="score-item">
            <div class="score-label">
                <span>Attacking</span>
                <span class="score-value">{scores.attacking}</span>
            </div>
            <div class="progress-bar-container">
                <div 
                    class="progress-bar attacking-bar" 
                    style={`width: ${Math.min(100, (scores.attacking / 100) * 100)}%;`}
                ></div>
            </div>
        </div>
        
        <!-- Passing -->
        <div class="score-item">
            <div class="score-label">
                <span>Passing</span>
                <span class="score-value">{scores.passing}</span>
            </div>
            <div class="progress-bar-container">
                <div 
                    class="progress-bar passing-bar" 
                    style={`width: ${(scores.passing / 150) * 100}%;`}
                ></div>
            </div>
        </div>
        
        <!-- Possession -->
        <div class="score-item">
            <div class="score-label">
                <span>Possession</span>
                <span class="score-value">{scores.possession}</span>
            </div>
            <div class="progress-bar-container">
                <div 
                    class="progress-bar possession-bar" 
                    style={`width: ${(scores.possession / 150) * 100}%;`}
                ></div>
            </div>
        </div>
        
        <!-- Defending -->
        <div class="score-item">
            <div class="score-label">
                <span>Defending</span>
                <span class="score-value">{scores.defending}</span>
            </div>
            <div class="progress-bar-container">
                <div 
                    class="progress-bar defending-bar" 
                    style={`width: ${(scores.defending / 150) * 100}%;`}
                ></div>
            </div>
        </div>
        
        <!-- Keeping -->
        <div class="score-item">
            <div class="score-label">
                <span>Keeping</span>
                <span class="score-value">{scores.keeping}</span>
            </div>
            <div class="progress-bar-container">
                <div 
                    class="progress-bar keeping-bar" 
                    style={`width: ${(scores.keeping / 150) * 100}%;`}
                ></div>
            </div>
        </div>
    </div>
</div>

<style>
    .team-scores-container {
        background: #2d3748;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin-top: 1rem;
    }

    .team-scores-title {
        color: #fff;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1.25rem;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .scores-grid {
        display: grid;
        gap: 1.25rem;
    }

    .score-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .score-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .score-label span:first-child {
        color: #e2e8f0;
        font-weight: 500;
        font-size: 0.95rem;
    }

    .score-value {
        color: #fff;
        font-weight: 600;
        font-size: 1rem;
        min-width: 3rem;
        text-align: right;
    }

    .progress-bar-container {
        width: 100%;
        height: 16px;
        background: #4a5568;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
    }

    .progress-bar {
        height: 100%;
        border-radius: 8px;
        transition: width 0.4s ease-out;
    }

    .attacking-bar {
        background: linear-gradient(90deg, #ef4444, #f87171);
    }

    .passing-bar {
        background: linear-gradient(90deg, #3b82f6, #93c5fd);
    }

    .possession-bar {
        background: linear-gradient(90deg, #10b981, #6ee7b7);
    }

    .defending-bar {
        background: linear-gradient(90deg, #f59e0b, #fcd34d);
    }

    .keeping-bar {
        background: linear-gradient(90deg, #8b5cf6, #c4b5fd);
    }
</style>