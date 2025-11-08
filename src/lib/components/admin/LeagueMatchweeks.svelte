<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/client/supabase/supaClient';
    
    // Retrieve and update matchweeks 
    
    // League data constants
    const LEAGUES = [
        { country_code: 1, nation: 'England', league_string: 'prem', max_games: 38 },
        { country_code: 2, nation: 'Spain', league_string: 'laliga', max_games: 38 },
        { country_code: 3, nation: 'Germany', league_string: 'bundes', max_games: 34 },
        { country_code: 4, nation: 'France', league_string: 'ligue1', max_games: 34 },
        { country_code: 5, nation: 'Italy', league_string: 'seriea', max_games: 38 }
    ];
    
    // Matchweek values for each league
    let matchweeks = {
        1: null,  // prem
        2: null,  // laliga
        3: null,  // bundes
        4: null,  // ligue1
        5: null   // seriea
    };
    
    let loading = false;
    let message = '';
    
    // Fetch current matchweeks on component mount
    onMount(async () => {
        await fetchCurrentMatchweeks();
    });
    
    // Fetch current matchweeks from database
    async function fetchCurrentMatchweeks() {
        try {
            const { data, error } = await supabase
                .from('league_info_reference')
                .select('country_code, current_matchweek')
                .in('country_code', [1, 2, 3, 4, 5]);
            
            if (error) {
                console.error('Error fetching matchweeks:', error);
                return;
            }
            
            if (!data || data.length === 0) {
                console.log('No leagues found in database');
                return;
            }
            
            // Update matchweeks object with fetched values
            data.forEach(row => {
                if (row.current_matchweek !== null) {
                    matchweeks[row.country_code] = row.current_matchweek;
                }
            });
            
            // Force reactivity
            matchweeks = matchweeks;
            
        } catch (err) {
            console.error('Error in fetchCurrentMatchweeks:', err);
        }
    }
    
    // Add main leagues to database
    async function addMainLeagues() {
        loading = true;
        message = '';
        
        try {
            // Prepare league data for insertion
            const leagueData = LEAGUES.map(league => ({
                country_code: league.country_code,
                nation: league.nation,
                league_string: league.league_string,
                max_games: league.max_games,
                current_matchweek: 1 // Start at matchweek 1
            }));
            
            const { data, error } = await supabase
                .from('league_info_reference')
                .upsert(leagueData, { 
                    onConflict: 'country_code',
                    ignoreDuplicates: false 
                });
            
            if (error) {
                message = `Error adding leagues: ${error.message}`;
                console.error('Error:', error);
            } else {
                message = 'Main leagues added successfully!';
                // Refresh matchweeks after adding
                await fetchCurrentMatchweeks();
            }
        } catch (err) {
            message = `Error: ${err.message}`;
            console.error('Error:', err);
        } finally {
            loading = false;
        }
    }
    
    // Upload all matchweeks to database
    async function uploadMatchweeks() {
        loading = true;
        message = '';
        
        try {
            // Prepare updates for all leagues
            const updates = Object.entries(matchweeks).map(([country_code, current_matchweek]) => ({
                country_code: parseInt(country_code),
                current_matchweek: current_matchweek ? parseInt(current_matchweek) : null
            }));
            
            // Filter out entries with null matchweeks if you want to skip them
            const validUpdates = updates.filter(u => u.current_matchweek !== null);
            
            if (validUpdates.length === 0) {
                message = 'No matchweeks to update';
                loading = false;
                return;
            }
            
            // Update each league's matchweek
            const updatePromises = validUpdates.map(update => 
                supabase
                    .from('league_info_reference')
                    .update({ current_matchweek: update.current_matchweek })
                    .eq('country_code', update.country_code)
            );
            
            const results = await Promise.all(updatePromises);
            
            // Check for errors
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                message = `Error updating matchweeks: ${errors[0].error.message}`;
                console.error('Errors:', errors);
            } else {
                message = 'Matchweeks updated successfully!';
            }
            
        } catch (err) {
            message = `Error: ${err.message}`;
            console.error('Error:', err);
        } finally {
            loading = false;
        }
    }
    
    // Helper function to get league name
    function getLeagueName(countryCode) {
        const league = LEAGUES.find(l => l.country_code === countryCode);
        return league ? `${league.nation} (${league.league_string})` : `League ${countryCode}`;
    }
</script>

<div class="admin-container">
    <h1>Update Matchweeks</h1>
    
    <!-- Add Main Leagues Section -->
    <!-- <div class="section">
        <h2>Initialize Leagues</h2>
        <button 
            on:click={addMainLeagues} 
            disabled={loading}
            class="btn-primary"
        >
            Add Main Leagues
        </button>
    </div> -->
    
    <!-- Update Matchweeks Section -->
    <div class="section">
        <h2>Current Matchweeks</h2>
        <div class="matchweek-grid">
            {#each Object.entries(matchweeks) as [countryCode, matchweek]}
                <div class="matchweek-item">
                    <label for="mw-{countryCode}">
                        {getLeagueName(parseInt(countryCode))}
                    </label>
                    <input 
                        id="mw-{countryCode}"
                        type="number" 
                        bind:value={matchweeks[countryCode]}
                        min="1"
                        max={LEAGUES.find(l => l.country_code === parseInt(countryCode))?.max_games || 38}
                        placeholder="MW"
                    />
                </div>
            {/each}
        </div>
        
        <button 
            on:click={uploadMatchweeks} 
            disabled={loading}
            class="btn-update"
        >
            Upload Matchweeks
        </button>
    </div>
    
    <!-- Status Message -->
    {#if message}
        <div class="message" class:success={message.includes('success')} class:error={message.includes('Error')}>
            {message}
        </div>
    {/if}
    
    {#if loading}
        <div class="loading">Processing...</div>
    {/if}
</div>

<style>
    .admin-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
    }
    
    h1 {
        color: #333;
        margin-bottom: 2rem;
        font-size: 1.75rem;
    }
    
    h2 {
        color: #555;
        margin-bottom: 1rem;
        font-size: 1.25rem;
    }
    
    .section {
        margin-bottom: 2.5rem;
        padding: 1.5rem;
        background: #f5f5f5;
        border-radius: 8px;
    }
    
    .matchweek-grid {
        display: grid;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .matchweek-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: white;
        padding: 0.75rem;
        border-radius: 4px;
        border: 1px solid #ddd;
    }
    
    .matchweek-item label {
        flex: 1;
        font-weight: 500;
        color: #444;
    }
    
    .matchweek-item input {
        width: 80px;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        text-align: center;
    }
    
    .matchweek-item input:focus {
        outline: none;
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
    }
    
    button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    /* .btn-primary {
        background: #2196F3;
        color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
        background: #1976D2;
    } */
    
    .btn-update {
        background: #4CAF50;
        color: white;
        width: 100%;
    }
    
    .btn-update:hover:not(:disabled) {
        background: #45a049;
    }
    
    .message {
        padding: 1rem;
        border-radius: 4px;
        margin-top: 1rem;
        text-align: center;
        font-weight: 500;
    }
    
    .message.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .message.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .loading {
        text-align: center;
        color: #666;
        margin-top: 1rem;
        font-style: italic;
    }
</style>