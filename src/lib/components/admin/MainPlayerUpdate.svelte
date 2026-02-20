<!-- AdminPlayerUpload.svelte -->
<script>
    import axios from 'axios';
    import { supabase } from '$lib/client/supabase/supaClient';

   let status = $state('idle');
    let currentLeague = $state('');
    let currentTeam = $state('');
    let currentPlayer = $state('');
    let processedCount = $state(0);
    let errorCount = $state(0);
    let injuryCount = $state(0);
    let errors = $state([]);
    let includePlayerUpload = $state(false);

    const leagues = {
        bundes: { name: 'Bundesliga', seasonId: 25646, color: '#d20515' },
        laliga: { name: 'La Liga', seasonId: 25659, color: '#ee8707' },
        ligue1: { name: 'Ligue 1', seasonId: 25651, color: '#091c3e' },
        prem: { name: 'Premier League', seasonId: 25583, color: '#3d195b' },
        seriea: { name: 'Serie A', seasonId: 25533, color: '#024494' }
    };

    const seasonString = '2526';

    async function getPlayerStatsAndUpload(playerId, teamName, seasonId, leagueString, seasonStr) {
        try {
            const { data } = await axios.get(`/api/players/${playerId}`, {
                params: { include: 'statistics.details.type' }
            });
            const player = data.data;

            // Your existing upload logic here
            // await supabase.from('players').upsert({ ... })

        } catch (err) {
            throw new Error(`Player ${playerId} (${teamName}): ${err.message}`);
        }
    }

    async function uploadInjuries(sidelinedArray) {
        const current = sidelinedArray.filter(s => {
            if (s.completed) return false;
            
            const start = new Date(s.start_date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (start < oneYearAgo) return false;
            
            if (s.end_date && new Date(s.end_date) < new Date()) return false;
            
            return true;
        });
        if (!current.length) return 0;

        const rows = current.map(s => ({
            id: s.id,
            player_id: s.player_id,
            category: s.category,
            start_date: s.start_date,
            games_missed: s.games_missed || 0
        }));

        const { error } = await supabase.from('injuries').upsert(rows, { onConflict: 'id' });
        if (error) throw new Error(`Injury upload failed: ${error.message}`);

        return rows.length;
    }

    async function processLeague(seasonId, leagueString, seasonStr, allSidelined) {
        currentLeague = leagues[leagueString]?.name || leagueString;
        let res;

        try {
            res = await axios.get(`/api/teams/seasons/${seasonId}`, {
                params: { include: 'players.player;coaches;sidelined' }
            });
        } catch (err) {
            errors = [...errors, `Failed to fetch teams for ${leagueString}: ${err.message}`];
            errorCount++;
            return;
        }

        const teams = res.data?.data;
        if (!teams) {
            errors = [...errors, `No data received for ${leagueString}`];
            return;
        }

        // First pass: collect all sidelined data from every team
        for (const team of teams) {
            currentTeam = team.name;

            if (team.sidelined?.length) {
                allSidelined.push(team.sidelined);
            }
        }

        // Second pass: individual player uploads (only if checkbox is on)
        if (includePlayerUpload) {
            for (const team of teams) {
                currentTeam = team.name;
                if (!team.players?.length) continue;

                for (const player of team.players) {
                    if (!player.player.date_of_birth) continue;

                    currentPlayer = player.player.name || `ID: ${player.player.id}`;

                    try {
                        await getPlayerStatsAndUpload(player.player.id, team.name, seasonId, leagueString, seasonStr);
                        processedCount++;
                    } catch (err) {
                        errorCount++;
                        errors = [...errors, err.message];
                    }
                }
            }
        }
    }

    function resetState() {
        status = 'running';
        processedCount = 0;
        errorCount = 0;
        injuryCount = 0;
        errors = [];
    }

    function finishState() {
        status = 'done';
        currentLeague = '';
        currentTeam = '';
        currentPlayer = '';
    }

    async function runAllLeagues() {
        resetState();
        const allSidelined = [];

        for (const [key, league] of Object.entries(leagues)) {
            await processLeague(league.seasonId, key, seasonString, allSidelined);
        }

        // Wipe and repopulate all injuries
        try {
            const { error: delError } = await supabase.from('injuries').delete().gte('id', 0);
            if (delError) throw new Error(`Failed to clear injuries: ${delError.message}`);

            for (const batch of allSidelined) {
                injuryCount += await uploadInjuries(batch);
            }
        } catch (err) {
            errors = [...errors, err.message];
            errorCount++;
        }

        finishState();
    }

    async function runSingleLeague(key) {
        resetState();
        const allSidelined = [];

        await processLeague(leagues[key].seasonId, key, seasonString, allSidelined);

        // Upsert only (don't wipe other leagues)
        try {
            for (const batch of allSidelined) {
                injuryCount += await uploadInjuries(batch);
            }
        } catch (err) {
            errors = [...errors, err.message];
            errorCount++;
        }

        finishState();
    }
</script>

<div class="admin-wrap">
    <h2>⚽ Player Upload Admin</h2>
    <p class="subtitle">Season 25/26 — Sportmonks → Supabase</p>

    <!-- Mode Toggle -->
    <label class="toggle">
        <input type="checkbox" bind:checked={includePlayerUpload} disabled={status === 'running'} />
        <span class="toggle-label">
            {includePlayerUpload ? '📦 Injuries + Individual Player Stats' : '🏥 Injuries Only (fast)'}
        </span>
    </label>

    <!-- Run All -->
    <button class="btn btn-all" onclick={runAllLeagues} disabled={status === 'running'}>
        {status === 'running' ? '⏳ Running...' : '🚀 Run All Leagues'}
    </button>

    <!-- Individual League Buttons -->
    <div class="league-grid">
        {#each Object.entries(leagues) as [key, league]}
            <button
                class="btn btn-league"
                style="--accent: {league.color};"
                onclick={() => runSingleLeague(key)}
                disabled={status === 'running'}
            >
                {league.name}
            </button>
        {/each}
    </div>

    <!-- Live Status -->
    {#if status === 'running'}
        <div class="status-card running">
            <div class="status-header">
                <span class="pulse"></span> Processing
            </div>
            <div class="status-details">
                {#if currentLeague}<div><span class="label">League:</span> {currentLeague}</div>{/if}
                {#if currentTeam}<div><span class="label">Team:</span> {currentTeam}</div>{/if}
                {#if includePlayerUpload && currentPlayer}<div><span class="label">Player:</span> {currentPlayer}</div>{/if}
            </div>
            <div class="status-counts">
                <span class="count injury">🏥 {injuryCount} injuries</span>
                {#if includePlayerUpload}<span class="count good">✅ {processedCount} players</span>{/if}
                {#if errorCount}<span class="count bad">❌ {errorCount}</span>{/if}
            </div>
        </div>
    {:else if status === 'done'}
        <div class="status-card done">
            ✅ Complete — {injuryCount} injuries uploaded
            {#if includePlayerUpload}, {processedCount} players{/if}
            {#if errorCount}, {errorCount} errors{/if}
        </div>
    {/if}

    <!-- Errors -->
    {#if errors.length > 0}
        <details class="panel error-panel">
            <summary>❌ Errors ({errors.length})</summary>
            <div class="panel-body">
                {#each errors as err}
                    <div class="error-line">{err}</div>
                {/each}
            </div>
        </details>
    {/if}
</div>

<style>
    .admin-wrap {
        max-width: 720px;
        margin: 2rem auto;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e0e0e0;
    }

    h2 {
        margin: 0 0 0.25rem;
        font-size: 1.5rem;
    }

    .subtitle {
        color: #888;
        font-size: 0.85rem;
        margin: 0 0 1.5rem;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        cursor: pointer;
        user-select: none;
    }

    .toggle input {
        width: 20px;
        height: 20px;
        accent-color: #6366f1;
        cursor: pointer;
    }

    .toggle-label {
        font-weight: 600;
        font-size: 0.95rem;
    }

    .btn {
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: opacity 0.15s, transform 0.1s;
    }

    .btn:hover:not(:disabled) {
        opacity: 0.85;
        transform: translateY(-1px);
    }

    .btn:active:not(:disabled) {
        transform: translateY(0);
    }

    .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .btn-all {
        display: block;
        width: 100%;
        padding: 0.85rem;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        font-size: 1rem;
        margin-bottom: 1rem;
    }

    .league-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .btn-league {
        padding: 0.65rem 0.75rem;
        background: var(--accent);
        color: white;
        font-size: 0.85rem;
    }

    .status-card {
        border-radius: 10px;
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
    }

    .status-card.running {
        background: #111827;
        border: 1px solid #374151;
    }

    .status-card.done {
        background: #052e16;
        border: 1px solid #166534;
        color: #4ade80;
        font-weight: 600;
    }

    .status-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        font-size: 1rem;
        margin-bottom: 0.75rem;
        color: #a5b4fc;
    }

    .pulse {
        width: 10px;
        height: 10px;
        background: #6366f1;
        border-radius: 50%;
        animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.8); }
    }

    .status-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: #d1d5db;
        margin-bottom: 0.75rem;
    }

    .label {
        color: #6b7280;
        font-size: 0.8rem;
    }

    .status-counts {
        display: flex;
        gap: 1rem;
    }

    .count {
        font-weight: 700;
        font-size: 0.95rem;
    }

    .count.good { color: #4ade80; }
    .count.injury { color: #60a5fa; }
    .count.bad { color: #f87171; }

    .panel {
        border-radius: 10px;
        margin-bottom: 1rem;
        overflow: hidden;
    }

    .panel summary {
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        user-select: none;
    }

    .panel-body {
        max-height: 300px;
        overflow-y: auto;
        padding: 0.75rem 1rem;
    }

    .error-panel {
        background: #1c0a0a;
        border: 1px solid #7f1d1d;
    }

    .error-panel summary { color: #f87171; }

    .error-line {
        color: #fca5a5;
        font-size: 0.8rem;
        padding: 0.3rem 0;
        border-bottom: 1px solid #2d1111;
        font-family: monospace;
    }
</style>