<script>
    import { supabaseScaling } from "$lib/client/supabase/supaClient";
    
    let leagueId = $state('');
    let isResetting = $state(false);
    let message = $state('');
    
    async function resetTeamStandings() {
        if (!leagueId.trim()) {
            message = '⚠️ Please enter a league ID';
            return;
        }
        
        isResetting = true;
        message = '';
        
        const { error } = await supabaseScaling
            .from('teams')
            .update({
                wins: 0,
                draws: 0,
                losses: 0,
                points: 0,
                goals_for: 0,
                goals_against: 0
            })
            .eq('league_id', leagueId.trim());
        
        if (error) {
            console.error('Error resetting team standings:', error);
            message = `❌ Error: ${error.message}`;
        } else {
            message = `✅ Standings reset for league ${leagueId}`;
            leagueId = '';
        }
        
        isResetting = false;
    }
</script>

<div class="reset-container">
    <h3>Reset Team Standings</h3>
    <div class="input-group">
        <input
            type="text"
            bind:value={leagueId}
            placeholder="Enter League ID"
            disabled={isResetting}
        />
        <button
            onclick={resetTeamStandings}
            disabled={isResetting}
        >
            {isResetting ? 'Resetting...' : 'Reset'}
        </button>
    </div>
    {#if message}
        <p class="message" class:error={message.includes('❌')} class:warning={message.includes('⚠️')}>
            {message}
        </p>
    {/if}
</div>

<style>
    .reset-container {
        max-width: 400px;
        padding: 1.5rem;
        background: white;
        border-radius: 0.75rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h3 {
        margin: 0 0 1rem 0;
        color: #4a5568;
    }
    
    .input-group {
        display: flex;
        gap: 0.5rem;
    }
    
    input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        font-size: 1rem;
    }
    
    input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }
    
    input:disabled {
        background: #f7fafc;
        cursor: not-allowed;
    }
    
    button {
        padding: 0.5rem 1rem;
        background: #e53e3e;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    button:hover:not(:disabled) {
        background: #c53030;
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .message {
        margin: 0.75rem 0 0 0;
        padding: 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: #c6f6d5;
        color: #276749;
    }
    
    .message.error {
        background: #fed7d7;
        color: #c53030;
    }
    
    .message.warning {
        background: #fefcbf;
        color: #975a16;
    }
</style>