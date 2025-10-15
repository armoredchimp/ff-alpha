<script>
    import { supabase } from '$lib/client/supabase/supaClient';
    import axios from 'axios';
    
    // State variables
    let startDate = new Date().toISOString().split('T')[0];
    let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let loading = false;
    let error = null;
    let progress = 0;
    let totalPlayers = 0;
    let processedPlayers = 0;
    let currentPage = 1;
    let statusMessage = '';
    

    const defaultPositions = {
        24 : 'Goalkeeper',
        25 : 'Central Midfield',
        26 : 'Attacking Midfield',
        27 : 'Centre Forward'
    }

    function posCheck(positionName) {
        if (positionName === 'Attacker') {
            return 'Centre Forward'
        } else if (positionName === 'Right Midfield') {
            return 'Right Wing'
        } else if (positionName === 'Left Midfield') {
            return 'Left Wing'
        } else {
            return positionName;
        }
    }


    // Function to adjust date by days
    function adjustDate(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    
    // Handle start date change
    function handleStartDateChange(e) {
        const newStartDate = e.target.value;
        const oldStartDate = startDate;
        startDate = newStartDate;
        
        const startDiff = Math.round((new Date(newStartDate) - new Date(oldStartDate)) / (1000 * 60 * 60 * 24));
        endDate = adjustDate(endDate, startDiff);
    }
    
    // Handle end date change
    function handleEndDateChange(e) {
        const newEndDate = e.target.value;
        const oldEndDate = endDate;
        endDate = newEndDate;
        
        const endDiff = Math.round((new Date(newEndDate) - new Date(oldEndDate)) / (1000 * 60 * 60 * 24));
        startDate = adjustDate(startDate, endDiff);
    }
    
    // Increment dates by one week
    function incrementWeek() {
        startDate = adjustDate(startDate, 7);
        endDate = adjustDate(endDate, 7);
    }
    
    // Decrement dates by one week
    function decrementWeek() {
        startDate = adjustDate(startDate, -7);
        endDate = adjustDate(endDate, -7);
    }
    
    // Process and upload data to Supabase
    async function processAndUploadData() {
        loading = true;
        error = null;
        progress = 0;
        totalPlayers = 0;
        processedPlayers = 0;
        currentPage = 1;
        let hasMore = true;
        
        try {
            statusMessage = 'Starting data processing...';
            
            while (hasMore) {
                statusMessage = `Fetching page ${currentPage}...`;
                
                // Fetch data from API
                const response = await axios.get(`/api/fixtures/between/${startDate}/${endDate}`, {
                    params: {
                        include: 'lineups.details.type',
                        page: currentPage
                    }
                });
                
                if (!response.data || !response.data.data) {
                    throw new Error('Invalid response structure');
                }
                
                const fixtures = response.data.data;
                const pagination = response.data.pagination;
                hasMore = pagination?.has_more || false;
                
                // Process fixtures and build player records
                const playerRecords = [];
                
                for (const fixture of fixtures) {
                    const seasonId = fixture.season_id;
                    const fixtureId = fixture.id;
                    
                    if (fixture.lineups && Array.isArray(fixture.lineups)) {
                        for (const lineup of fixture.lineups) {
                            // Create base record for player

                       
                            const playerRecord = {
                                player_id: lineup.player_id,
                                season_id: seasonId,
                                fixture_id: fixtureId,
                                player_name: lineup.player_name,
                                
                            };
                            
                            // Process each stat detail
                            if (lineup.details && Array.isArray(lineup.details)) {
                                for (const detail of lineup.details) {
                                    if (detail.type && detail.type.developer_name && detail.data) {
                                        const columnName = detail.type.developer_name.toLowerCase();
                                        const value = detail.data.value;
                                        
                                        // Handle different value types
                                        if (typeof value === 'boolean') {
                                            playerRecord[columnName] = value;
                                        } else if (typeof value === 'number') {
                                            playerRecord[columnName] = value;
                                        } else if (value !== null && value !== undefined) {
                                            playerRecord[columnName] = value;
                                        }
                                    }
                                }
                            }
                            
                            playerRecords.push(playerRecord);
                        }
                    }
                }
                
                totalPlayers += playerRecords.length;
                
                // Batch insert to Supabase
                if (playerRecords.length > 0) {
                    statusMessage = `Uploading ${playerRecords.length} player records from page ${currentPage}...`;
                    
                    // Process in smaller batches to avoid timeouts
                    const BATCH_SIZE = 100;
                    for (let i = 0; i < playerRecords.length; i += BATCH_SIZE) {
                        const batch = playerRecords.slice(i, Math.min(i + BATCH_SIZE, playerRecords.length));
                        
                        const { data, error: supabaseError } = await supabase
                            .from('current_week_stats')
                            .upsert(batch, { 
                                onConflict: 'player_id',
                                ignoreDuplicates: false 
                            });
                        
                        if (supabaseError) {
                            console.error('Supabase error:', supabaseError);
                            throw new Error(`Failed to upload batch: ${supabaseError.message}`);
                        }
                        
                        processedPlayers += batch.length;
                        progress = Math.round((processedPlayers / totalPlayers) * 100);
                    }
                }
                
                currentPage++;
                
                // Add a small delay to avoid rate limiting
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            
            statusMessage = `Successfully processed ${totalPlayers} player records!`;
            progress = 100;
            
        } catch (err) {
            error = err.message || 'Failed to process data';
            statusMessage = 'Error occurred during processing';
            console.error('Error processing data:', err);
        } finally {
            loading = false;
        }
    }
    

    async function weeklyPositions(){
        loading = true;
        error = null;
        progress = 0;
        totalPlayers = 0;
        processedPlayers = 0;
        currentPage = 1;
        let hasMore = true;

        try {
            statusMessage = 'Starting position data processing...';
            
            while (hasMore) {
                statusMessage = `Fetching positions page ${currentPage}...`;
                
                const response = await axios.get(`/api/fixtures/between/${startDate}/${endDate}`, {
                    params: {
                        include: 'lineups.detailedposition',
                        page: currentPage
                    }
                });

                if (!response.data || !response.data.data) {
                    throw new Error('Invalid response structure');
                }
                        
                const fixtures = response.data.data;
                const pagination = response.data.pagination;
                hasMore = pagination?.has_more || false;

                const playerData = [];

                for(const fixture of fixtures){
                    if(fixture.lineups && Array.isArray(fixture.lineups)) {
                        for (const lineup of fixture.lineups) {
                            let detailed_position = null;
                            
                            if(lineup.detailedposition && lineup.detailedposition.name) {
                                detailed_position = posCheck(lineup.detailedposition.name);
                            } else if (lineup.position_id){
                                // if no detailed position, use position id for a default position by group
                                detailed_position = defaultPositions[lineup.position_id];
                            } else {
                                console.error(`Unable to find position for player ${lineup.player_id}`);
                            }

                            const player = {
                                player_id: lineup.player_id,
                                detailed_position: detailed_position
                            };

                            playerData.push(player);
                        }
                    }    
                }

                totalPlayers += playerData.length;
                
                // Batch insert to Supabase
                if (playerData.length > 0) {
                    statusMessage = `Uploading ${playerData.length} position records from page ${currentPage}...`;
                    
                    // Process in smaller batches to avoid timeouts
                    const BATCH_SIZE = 100;
                    for (let i = 0; i < playerData.length; i += BATCH_SIZE) {
                        const batch = playerData.slice(i, Math.min(i + BATCH_SIZE, playerData.length));
                        
                        const { data, error: supabaseError } = await supabase
                            .from('current_week_stats')
                            .upsert(batch, { 
                                onConflict: 'player_id',
                                ignoreDuplicates: false 
                            });
                        
                        if (supabaseError) {
                            console.error('Supabase error:', supabaseError);
                            throw new Error(`Failed to upload batch: ${supabaseError.message}`);
                        }
                        
                        processedPlayers += batch.length;
                        progress = Math.round((processedPlayers / totalPlayers) * 100);
                    }
                }
                
                currentPage++;
                
                // Add a small delay to avoid rate limiting
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            statusMessage = `Successfully processed ${totalPlayers} position records!`;
            progress = 100;
            
        } catch (err) {
            error = err.message || 'Failed to process position data';
            statusMessage = 'Error occurred during position processing';
            console.error('Error processing position data:', err);
        } finally {
            loading = false;
        }
    }

</script>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    h1 {
        color: #333;
        margin-bottom: 2rem;
        font-size: 2rem;
        font-weight: 600;
    }
    
    .date-controls {
        background: #f5f5f5;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
    }
    
    .date-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .date-group {
        display: flex;
        flex-direction: column;
    }
    
    label {
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #555;
    }
    
    input[type="date"] {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }
    
    button {
        padding: 0.75rem 1.5rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        transition: background 0.2s;
    }
    
    button:hover {
        background: #0056b3;
    }
    
    button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    
    .week-buttons {
        display: flex;
        gap: 0.5rem;
    }
    
    .week-button {
        padding: 0.5rem 1rem;
        background: #6c757d;
        font-size: 0.9rem;
    }
    
    .week-button:hover {
        background: #545b62;
    }
    
    .position-button {
        background: #17a2b8;
    }

    .position-button:hover {
        background: #138496;
    }

    .upload-button {
        background: #28a745;
    }
    
    .upload-button:hover {
        background: #218838;
    }
    
    .progress-container {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 2rem;
        margin-top: 2rem;
    }
    
    .progress-header {
        margin-bottom: 1.5rem;
    }
    
    .progress-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        color: #333;
    }
    
    .status-message {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
    
    .progress-bar-container {
        width: 100%;
        height: 30px;
        background: #e9ecef;
        border-radius: 15px;
        overflow: hidden;
        position: relative;
    }
    
    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        transition: width 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .progress-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #dee2e6;
    }
    
    .stat-item {
        display: flex;
        flex-direction: column;
    }
    
    .stat-label {
        color: #666;
        font-size: 0.85rem;
        margin-bottom: 0.25rem;
    }
    
    .stat-value {
        color: #333;
        font-size: 1.25rem;
        font-weight: 600;
    }
    
    .error {
        background: #f8d7da;
        color: #721c24;
        padding: 1rem;
        border-radius: 4px;
        margin-top: 1rem;
    }
    
    .success-message {
        background: #d4edda;
        color: #155724;
        padding: 1rem;
        border-radius: 4px;
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .success-icon {
        font-size: 1.5rem;
    }
</style>

<div class="container">
    <h1>Football Stats Uploader</h1>
    
    <div class="date-controls">
        <div class="date-inputs">
            <div class="date-group">
                <label for="start-date">Start Date</label>
                <input 
                    id="start-date"
                    type="date" 
                    value={startDate}
                    on:change={handleStartDateChange}
                    disabled={loading}
                />
            </div>
            
            <div class="date-group">
                <label for="end-date">End Date</label>
                <input 
                    id="end-date"
                    type="date" 
                    value={endDate}
                    on:change={handleEndDateChange}
                    disabled={loading}
                />
            </div>
        </div>
        
        <div class="button-group">
            <div class="week-buttons">
                <button 
                    class="week-button" 
                    on:click={decrementWeek}
                    disabled={loading}
                >
                    ← Previous Week
                </button>
                <button 
                    class="week-button" 
                    on:click={incrementWeek}
                    disabled={loading}
                >
                    Next Week →
                </button>
            </div>
            
            <button 
                class="upload-button" 
                on:click={processAndUploadData}
                disabled={loading}
            >
                {loading ? 'Processing...' : 'Upload to Supabase'}
            </button>

            <button 
                class="position-button" 
                on:click={weeklyPositions}
                disabled={loading}
            >
                {loading ? 'Processing...' : 'Upload Positions'}
            </button>
        </div>
    </div>
    
    {#if loading || progress > 0}
        <div class="progress-container">
            <div class="progress-header">
                <h2>Upload Progress</h2>
                <div class="status-message">{statusMessage}</div>
            </div>
            
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: {progress}%">
                    {#if progress > 0}
                        {progress}%
                    {/if}
                </div>
            </div>
            
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-label">Processed Players</span>
                    <span class="stat-value">{processedPlayers}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Current Page</span>
                    <span class="stat-value">{currentPage}</span>
                </div>
            </div>
        </div>
    {/if}
    
    {#if error}
        <div class="error">
            Error: {error}
        </div>
    {/if}
    
    {#if !loading && progress === 100}
        <div class="success-message">
            <span class="success-icon">✓</span>
            <span>Successfully uploaded {totalPlayers} player records to Supabase!</span>
        </div>
    {/if}
</div>