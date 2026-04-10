<script>
    import { supabase } from "$lib/client/supabase/supaClient";
    import { statsToRank, keeperStatsToRank } from "$lib/data/statsToRank";
    
    const leagues = ["laliga", "prem", "ligue1", "bundes", "seriea"];
    const season = "2526";

    const invertedStats = [
        "ShotsOffTargetPer90",
        "BigChancesMissedPer90",
        "FoulsPer90",
        "OffsidesPer90",
        "GoalsConcededPer90",
        "DispossessedPer90",
        "DribbledPastPer90",
        "ErrorLeadToGoal"
    ];

    let status = {};
    let running = false;

    function rankPlayers(players, stat, isInverted, rankedData) {
        const sorted = [...players].sort((a, b) =>
            isInverted ? a[stat] - b[stat] : b[stat] - a[stat]
        );

        let currentRank = 0;
        let prevValue = null;

        sorted.forEach((player) => {
            const ranked = rankedData.find((p) => p.id === player.id);
            if (!ranked) return;

            if (player[stat] !== prevValue) currentRank++;
            prevValue = player[stat];

            if (currentRank <= 50) {
                ranked[stat] = currentRank;
            } else if (currentRank >= sorted.length - 49) {
                ranked[stat] = -(sorted.length - currentRank + 1);
            } else {
                ranked[stat] = 0;
            }
        });
    }

    async function processLeague(league) {
        const ninetyTable = `${league}_stats_${season}_per90`;
        const rankTable = `${league}_stats_${season}_rankings`;

        status[league] = { state: "fetching", message: "Fetching per90 data..." };
        status = status;

        const { data, error } = await supabase.from(ninetyTable).select("*");

        if (error || !data?.length) {
            status[league] = { state: "error", message: error?.message || "No data found" };
            status = status;
            return;
        }

        status[league] = { state: "ranking", message: `Ranking ${data.length} players...` };
        status = status;

        const maxMinutes = Math.max(...data.map((p) => p.MinutesPlayed));
        const filtered = data.filter((p) => p.MinutesPlayed >= maxMinutes / 3);
        const keepers = filtered.filter((p) => p.DetailedPosition === "Goalkeeper");
        const outfield = filtered.filter((p) => p.DetailedPosition !== "Goalkeeper");

        const allStats = [...statsToRank, ...keeperStatsToRank];
        const rankedData = filtered.map((player) => ({
            id: player.id,
            PlayerName: player.PlayerName,
            DetailedPosition: player.DetailedPosition,
            ...Object.fromEntries(allStats.map((s) => [s, 0]))
        }));

        statsToRank.forEach((stat) => {
            rankPlayers(outfield, stat, invertedStats.includes(stat), rankedData);
        });

        keeperStatsToRank.forEach((stat) => {
            rankPlayers(keepers, stat, invertedStats.includes(stat), rankedData);
        });

        status[league] = { state: "uploading", message: `Upserting ${rankedData.length} records...` };
        status = status;

        const { error: upsertErr } = await supabase
            .from(rankTable)
            .upsert(rankedData, { onConflict: "id" });

        if (upsertErr) {
            status[league] = { state: "error", message: upsertErr.message };
        } else {
            status[league] = { state: "done", message: `${rankedData.length} players ranked` };
        }
        status = status;
    }

    async function runAll() {
        running = true;
        status = {};
        for (const league of leagues) {
            await processLeague(league);
        }
        running = false;
    }

    async function runSingle(league) {
        running = true;
        await processLeague(league);
        running = false;
    }
</script>

<div class="admin-rankings">
    <div class="header">
        <h2>Stat Rankings</h2>
        <span class="season-tag">{season}</span>
    </div>

    <button class="run-all" on:click={runAll} disabled={running}>
        {running ? "Processing..." : "Run All Leagues"}
    </button>

    <div class="league-grid">
        {#each leagues as league}
            {@const s = status[league]}
            <div class="league-card" class:error={s?.state === "error"} class:done={s?.state === "done"}>
                <div class="league-name">{league}</div>
                <button on:click={() => runSingle(league)} disabled={running}>
                    Run
                </button>
                {#if s}
                    <div class="status" class:error={s.state === "error"} class:done={s.state === "done"}>
                        {#if s.state === "fetching" || s.state === "ranking" || s.state === "uploading"}
                            <span class="spinner"></span>
                        {/if}
                        {s.message}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .admin-rankings {
        max-width: 600px;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .header h2 {
        margin: 0;
        font-size: 1.25rem;
    }

    .season-tag {
        font-size: 0.75rem;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
    }

    .run-all {
        width: 100%;
        padding: 0.6rem;
        margin-bottom: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .run-all:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
    }

    .run-all:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .league-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .league-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
    }

    .league-card.done {
        border-color: rgba(80, 200, 120, 0.3);
    }

    .league-card.error {
        border-color: rgba(255, 80, 80, 0.3);
    }

    .league-name {
        font-weight: 600;
        min-width: 60px;
        font-size: 0.9rem;
    }

    .league-card button {
        padding: 0.25rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .league-card button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
    }

    .league-card button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .status {
        font-size: 0.8rem;
        opacity: 0.7;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-left: auto;
    }

    .status.done {
        color: rgb(80, 200, 120);
        opacity: 1;
    }

    .status.error {
        color: rgb(255, 80, 80);
        opacity: 1;
    }

    .spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>