<script>
    import InjuryTable from '$lib/InjuryTable.svelte'
    import ResultsDisplay from '$lib/ResultsDisplay.svelte'
    import Table from '$lib/Table.svelte'
    import { teams, playerTeam } from "$lib/stores/teams.svelte";
</script>

<div class="flex gap-10 p-5">
    <div>
        <a href="/table" class="section-btn">League Table</a>
        <Table teams={teams} playerTeam={playerTeam} mini={true} />
    </div>
    <div>
        <a href="/injuries" class="section-btn">Injuries</a>
        <InjuryTable mini={true} />
    </div>
    <div>
        <a href="/results" class="section-btn">Results</a>
        <ResultsDisplay mini={true} />
    </div>
</div>

<style>
    .section-btn {
        display: inline-block;
        margin-bottom: 0.75rem;
        padding: 0.4rem 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 0.25rem;
        color: #374151;
        text-decoration: none;
        cursor: pointer;
    }

    .section-btn:hover {
        background: #e5e7eb;
    }
</style>