<script lang="ts">
	import { goto } from "$app/navigation";
	import { getLeagueState } from "$lib/stores/league.svelte";
	import { fetchAuthSession } from "aws-amplify/auth";
    import axios from "axios";
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import type { SubmitFunction } from '@sveltejs/kit';

    const REGISTER_LEAGUE_URL = import.meta.env.VITE_AWS_REGISTER_LEAGUE_URL;

    let selectedTeams = $state<14 | 16 | 18 | 20>(14);
    let selectedCountry = $state<string>('england');
    let leagueName = $state<string>('');
    let isCreating = $state<boolean>(false);
    let userId = $state<string>('');
    let creationToken = $state<string>('');

    // Get user info on mount
    $effect(() => {
        (async () => {
            const leagueState = getLeagueState();
            const session = await fetchAuthSession();
            userId = session.tokens?.idToken?.payload?.sub as string || '';
            creationToken = leagueState.creationToken || '';
            
            if (!creationToken) {
                alert('Not authorized to create a league. Please refresh and try again.');
                goto('/');
            }
        })();
    });

    const handleFormSubmit: SubmitFunction = async ({ formData, action, cancel }) => {
        isCreating = true;
        
        // Let the form submit to server action
        return async ({ result, update }) => {
            if (result.type === 'success' && result.data?.success) {
                // League created in Supabase, now register with Lambda
                try {
                    const session = await fetchAuthSession();
                    const idToken = session.tokens?.idToken?.toString();
                    
                    const registerResponse = await axios.put(REGISTER_LEAGUE_URL, {
                        leagueId: result.data.league.id,
                        creationToken: creationToken
                    }, {
                        headers: {
                            'Authorization': idToken,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (registerResponse.data.success) {
                        console.log('League registered successfully!');
                        
                        // Update local state
                        const leagueState = getLeagueState();
                        leagueState.hasLeague = true;
                        leagueState.leagueId = result.data.league.id;
                        leagueState.canCreateLeague = false;
                        leagueState.creationToken = null;
                        
                        // Occasional bug when going to /draft after league creation. 
                        // have not been able to replicate but it is likely involving the cookie/leagueID
                        await invalidateAll();
                        
                        // Navigate to draft
                        goto('/draft');
                    } else {
                        throw new Error('Failed to register league');
                    }
                } catch (error: any) {
                    console.error('Error registering league:', error);
                    
                    // Clean up the created league
                    const deleteForm = new FormData();
                    deleteForm.append('leagueId', result.data.league.id);
                    
                    await fetch('?/deleteLeague', {
                        method: 'POST',
                        body: deleteForm
                    });
                    
                    if (error.response?.status === 403) {
                        alert('Your session has expired or you already have a league. Please refresh and try again.');
                        goto('/');
                    } else {
                        alert('Failed to register league. Please try again.');
                    }
                }
            } else if (result.type === 'failure') {
                alert(result.data?.error || 'Failed to create league');
            }
            
            isCreating = false;
        };
    }
</script>

<div class="create-league-container">
    <div class="content-wrapper">
        <header>
            <h1>Create Your League</h1>
        </header>

        <main class="create-league-section">
            <form method="POST" action="?/createLeague" use:enhance={handleFormSubmit}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="creationToken" value={creationToken} />
                <input type="hidden" name="selectedTeams" value={selectedTeams} />
                <input type="hidden" name="selectedCountry" value={selectedCountry} />
                
                <div class="input-group">
                    <label for="leagueName">League Name</label>
                    <input 
                        type="text" 
                        id="leagueName"
                        name="leagueName" 
                        bind:value={leagueName}
                        placeholder="Enter your league name"
                        disabled={isCreating}
                        required
                    />
                </div>

                <div class="input-group">
                    <label for="selectedTeams">Total Teams</label>
                    <p class="field-description">Select the number of teams in your league (including yours)</p>
                    <div class="teams-selector">
                       {#each [14, 16, 18, 20] as teamCount}
                            <button 
                                type="button"
                                class="team-option {selectedTeams === teamCount ? 'selected' : ''}"
                                onclick={() => selectedTeams = teamCount}
                                disabled={isCreating}
                            >
                                {teamCount}
                            </button>
                        {/each}
                    </div>
                </div>
                
                <div class="input-group">
                    <label for="selectedTeams">Country League</label>
                    <p class="field-description">Select which country's players will be available</p>
                    <div class="country-selector">
                        <button 
                            type="button"
                            class="country-option {selectedCountry === 'england' ? 'selected' : ''}"
                            onclick={() => selectedCountry = 'england'}
                            disabled={isCreating}
                        >
                            <img class="flag-icon" src="https://flagcdn.com/w20/gb-eng.png" alt="England Flag">
                            England - Premier League
                        </button>
                        <button 
                            type="button"
                            class="country-option disabled"
                            disabled
                        >
                            <img class="flag-icon" src="https://flagcdn.com/w20/es.png" alt="Spain Flag">
                            Spain - La Liga
                            <span class="coming-soon">Coming Soon</span>
                        </button>
                        <button 
                            type="button"
                            class="country-option disabled"
                            disabled
                        >
                            <img class="flag-icon" src="https://flagcdn.com/w20/de.png" alt="Germany Flag">
                            German Bundesliga
                            <span class="coming-soon">Coming Soon</span>
                        </button>
                        <button 
                            type="button"
                            class="country-option disabled"
                            disabled
                        >
                            <img class="flag-icon" src="https://flagcdn.com/w20/fr.png" alt="France Flag">
                            France - Ligue 1
                            <span class="coming-soon">Coming Soon</span>
                        </button>
                        <button 
                            type="button"
                            class="country-option disabled"
                            disabled
                        >
                            <img class="flag-icon" src="https://flagcdn.com/w20/it.png" alt="Italy Flag">
                            Italy - Serie A
                            <span class="coming-soon">Coming Soon</span>
                        </button>
                    </div>
                </div>
                
                <button 
                    type="submit" 
                    class="confirm-button"
                    disabled={isCreating || !leagueName.trim()}
                >
                    {isCreating ? 'Creating League...' : 'Create League'}
                </button>
            </form>
        </main>
    </div>
</div>

<style>
.create-league-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
    background-color: #f0f2f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
                 Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.content-wrapper {
    background-color: #ffffff;
    padding: 35px 40px;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
    width: 100%;
    max-width: 480px;
    text-align: center;
    border: 1px solid #e0e0e0;
}

header h1 {
    font-size: 2.1rem;
    font-weight: 300;
    color: #2c3e50;
    margin: 0 0 30px 0;
}

.create-league-section {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.input-group {
    text-align: left;
}

.input-group label {
    display: block;
    font-size: 0.9rem;
    color: #333;
    margin-bottom: 7px;
    font-weight: 500;
}

.field-description {
    font-size: 0.75rem;
    color: #666;
    margin-top: -3px;
    margin-bottom: 10px;
}

.input-group input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.input-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.input-group input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
}

.teams-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.team-option {
    flex: 1;
    min-width: 45px;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: white;
    color: #333;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

.team-option:hover:not(:disabled) {
    border-color: #3b82f6;
    background-color: #f0f7ff;
}

.team-option.selected {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.team-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.country-selector {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.country-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: white;
    color: #333;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    text-align: left;
    position: relative;
}

.country-option:hover:not(:disabled) {
    border-color: #3b82f6;
    background-color: #f0f7ff;
}

.country-option.selected {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.country-option.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f9f9f9;
}

.country-option .flag {
    font-size: 1.3rem;
}

.coming-soon {
    position: absolute;
    right: 16px;
    font-size: 0.7rem;
    color: #999;
    font-weight: 400;
    font-style: italic;
}

.confirm-button {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    margin-top: 12px;
    width: 100%;
}

.confirm-button:hover:not(:disabled) {
    background-color: #2563eb;
}

.confirm-button:disabled {
    background-color: #93bbf9;
    cursor: not-allowed;
}
</style>