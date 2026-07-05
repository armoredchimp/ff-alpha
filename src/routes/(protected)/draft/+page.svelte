<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import '../../../app.css';
    import { allPlayers, managers, managersByID } from '$lib/stores/generic.svelte';
    import {
        generateClubName,
        generateClubTraits,
        getRandomItem,
        playerName
    } from '$lib/utils';
    import { teams, playerTeam } from '$lib/stores/teams.svelte';
    import { draft } from '$lib/stores/draft.svelte';
    import { loadPlayersData } from '$lib/loading/players/loadPlayers';
    import DraftPlayer from '$lib/DraftPlayer.svelte';
    import DraftTicker from '$lib/DraftTicker.svelte';
    import PlayerDraftTeam from '$lib/PlayerDraftTeam.svelte';
    import DraftTeam from '$lib/DraftTeam.svelte';
    import { getLeagueState } from '$lib/stores/league.svelte';
    import { TABLE_PREFIXES } from '$lib/data/leagueConstants';

    const { data } = $props();

    // ---- view state (server is authoritative; these mirror it for rendering) ----
    let selectedNames = $state({});
    let clubsWithRivals = $state({});
    let firstParts = $state([]);
    let secondParts = $state([]);
    let commonNames = $state([]);
    let leagueState = $state();
    let submitting = $state(false);

    // non-reactive helpers (their effects funnel through the draft store)
    let cursor = 0;                         // index into draft.orderList (order position)
    let draftedIds = new Set();
    let playersById = new Map();

    onMount(async () => {
        if (draft.loaded) return;
        leagueState = getLeagueState();

        await loadClubNames(leagueState.countriesCode);

        if (allPlayers.length > 0) {
            console.log(`Using ${allPlayers.length} pre-loaded players`);
        } else {
            await loadPlayersData(leagueState.countriesCode);
        }
        // fast id -> player lookup for delta application
        for (const p of allPlayers) playersById.set(p.id, p);

        // team count (server league row is source of truth; data.numOfTeams from load)
        if (data.numOfTeams && data.numOfTeams > 14) draft.totalTeams = data.numOfTeams;
        else if (leagueState.numOfTeams > 14) draft.totalTeams = leagueState.numOfTeams;

        if (data.managers && data.managers.length > 0) {
            managers.length = 0;
            for (const m of data.managers) managers.push(m);
        }

       

        // ---- resume check: if a draft is already in progress, rehydrate ----
        try {
            const res = await fetch('/api/supabase/draft/resume');
            const state = await res.json();
            if (res.ok && state.inProgress) {
                syncFullState(state);
                draft.loaded = true;
                return;
            }
        } catch (err) {
            console.error('Resume check failed:', err);
        }

        draft.gate0 = true;   // fresh: show "Create Teams"
        draft.loaded = true;
    });

    async function loadClubNames(countriesCode) {
        const prefix = TABLE_PREFIXES[countriesCode];
        if (!prefix) { console.error('Invalid country code:', countriesCode); return; }
        try {
            const module = await import(`$lib/data/${prefix}/rngClubNames.js`);
            firstParts = module.firstParts || [];
            secondParts = module.secondParts || [];
            commonNames = module.commonNames || [];
        } catch (error) {
            console.error(`Failed to load club names for ${prefix}:`, error);
        }
    }

    // ---- lookups ----
    function localTeamByDbId(teamId) {
        if (playerTeam.dbId === teamId) return playerTeam;
        for (let i = 1; i < draft.totalTeams; i++) {
            if (teams[`team${i}`].dbId === teamId) return teams[`team${i}`];
        }
        return null;
    }

    function teamNameFor(teamId, frontendNumber) {
        if (frontendNumber === 0) return playerTeam.name;
        const t = localTeamByDbId(teamId);
        return t ? t.name : `Team ${frontendNumber}`;
    }

    // round-1 order sequence -> local display draftOrder (so cards sort by true pick order)
    function syncDisplayOrder(order) {
        const round1 = order.filter(o => o.round === 1).sort((a, b) => a.pick - b.pick);
        round1.forEach((slot, idx) => {
            const t = localTeamByDbId(slot.teamId);
            if (t) t.draftOrder = idx + 1;
        });
    }

    function updateTurnDisplay() {
        const cur = draft.orderList[cursor];
        const nxt = draft.orderList[cursor + 1];
        if (cur) {
            draft.currentRound = cur.round;
            draft.currentPick = cur.pick;
            draft.currentTeam = teamNameFor(cur.teamId, cur.frontendNumber);
        }
        draft.nextTeam = nxt ? teamNameFor(nxt.teamId, nxt.frontendNumber) : 'None';
    }

    // ---- place a pick's player onto its team's roster ----
    function placePick(pick, decrementBudget) {
        if (pick.playerId == null) return;             // sentinel/skip — no roster change
        draftedIds.add(pick.playerId);
        const player = playersById.get(pick.playerId);
        const team = localTeamByDbId(pick.teamId);
        if (!player || !team) return;
        switch (pick.position) {
            case 'Goalkeeper': team.keepers.push(player); break;
            case 'Defender':   team.defenders.push(player); break;
            case 'Midfielder': team.midfielders.push(player); break;
            case 'Attacker':   team.attackers.push(player); break;
        }
        if (decrementBudget) {
            team.transferBudget -= pick.transferValue;
            team.playerCount = (team.playerCount || 0) + 1;
        }
    }

    // ---- apply a live delta from pick/advance ----
    function applyDelta(delta) {
        const { picks = [], overallDone, done } = delta;
        for (const pick of picks) placePick(pick, true);
        draft.availablePlayers = allPlayers.filter(p => !draftedIds.has(p.id));
        cursor = overallDone;
        updateTurnDisplay();
        if (done) finishDraft();
    }

    // ---- rehydrate the entire view from a resume/full-state payload ----
    function syncFullState(state) {
        draft.totalTeams = state.teams.length;

        for (const st of state.teams) {
            const target = st.frontendNumber === 0 ? playerTeam : teams[`team${st.frontendNumber}`];
            target.name = st.name;
            target.dbId = st.teamId;
            target.traits = st.traits ?? [];
            target.formation = st.formation;
            target.rivals = st.rivals ?? [];
            target.manager = st.manager != null
                ? (managersByID[st.manager] ?? null)
                : (target.manager ?? null);
            target.transferBudget = st.budget;     // server-computed current budget
            target.keepers = []; target.defenders = []; target.midfielders = []; target.attackers = [];
            target.playerCount = 0;
        }

        draft.orderList = state.order;
        syncDisplayOrder(state.order);

        draftedIds.clear();
        for (const pick of state.picks) placePick(pick, false);   // budgets already current
        // playerCount = roster size after rebuild
        for (const st of state.teams) {
            const t = st.frontendNumber === 0 ? playerTeam : teams[`team${st.frontendNumber}`];
            t.playerCount = t.keepers.length + t.defenders.length + t.midfielders.length + t.attackers.length;
        }

        draft.availablePlayers = allPlayers.filter(p => !draftedIds.has(p.id));
        cursor = state.overallDone;
        draft.gate0 = true;
        draft.gate1 = true;
        draft.started = true;
        updateTurnDisplay();
    }

    function finishDraft() {
        draft.complete = true;
        // server has finalized (team_players + budgets + draft_complete). Leaving the
        // page triggers the load() redirect to the main app.
        setTimeout(() => goto('/main'), 1200);
    }

    // ============================================================
    // Draft setup — cosmetic identity generation, then server draft-start
    // ============================================================
    async function draftSetup() {
        if (submitting) return;
        submitting = true;

        playerTeam.name = playerName();
        for (let i = 1; i < draft.totalTeams; i++) {
            const { name, sameCity, firstName } = generateClubName(firstParts, commonNames, secondParts);
            teams[`team${i}`].name = name;
            if (!selectedNames[firstName]) selectedNames[firstName] = { name, index: i };
            teams[`team${i}`].traits = generateClubTraits();
            if (managers.length > 0) {
                teams[`team${i}`].manager = getRandomItem(managers);
                if (teams[`team${i}`].manager.preferred_formation !== null) {
                    teams[`team${i}`].formation = teams[`team${i}`].manager.preferred_formation;
                }
            }
            if (sameCity) assignRivals(firstName, true, i);
        }
        for (let i = draft.totalTeams; i > 0; i--) {
            if ((clubsWithRivals[i] || []).length < 2) assignRivals('', false, i);
        }

        draft.availablePlayers = allPlayers;

        // build team payload (identities only; server sets budget/frontend/draft_order)
        const teamsToInsert = [{
            team_name: playerTeam.name,
            rivals: playerTeam.rivals || [],
            formation: playerTeam.formation || '4-4-2',
            frontend_number: 0
        }];
        for (let i = 1; i < draft.totalTeams; i++) {
            const team = teams[`team${i}`];
            teamsToInsert.push({
                team_name: team.name,
                rivals: team.rivals || [],
                traits: team.traits || [],
                frontend_number: i,
                manager_id: team.manager?.id ?? null,
                formation: team.formation || '4-4-2'
            });
        }

        try {
            const fd = new FormData();
            fd.append('teams', JSON.stringify(teamsToInsert));
            const res = await fetch('/api/supabase/draft/start', { method: 'POST', body: fd });
            const result = await res.json();
            if (!res.ok || !result.success) {
                console.error('Draft start failed:', result.error);
                submitting = false;
                return;
            }

            // store server-assigned team ids
            playerTeam.dbId = result.teamIdMap['0'];
            for (let i = 1; i < draft.totalTeams; i++) {
                teams[`team${i}`].dbId = result.teamIdMap[i.toString()];
            }

            draft.orderList = result.order;
            syncDisplayOrder(result.order);
            cursor = 0;
            draft.gate1 = true;
        } catch (error) {
            console.error('Failed to start draft:', error);
        } finally {
            submitting = false;
        }
    }

    // ============================================================
    // Draft flow — all picks go through the server
    // ============================================================
    function beginDraft() {
        if (draft.started) return;
        draft.started = true;
        cursor = 0;
        updateTurnDisplay();
    }

    async function handlePlayerPick(player, e) {
        if (draft.complete || submitting) return;
        if (draft.currentTeam !== playerTeam.name) return;   // not your turn
        if (!player.image_path) player.image_path = e;
        submitting = true;
        try {
            const res = await fetch('/api/supabase/draft/pick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: player.id })
            });
            const delta = await res.json();
            if (!res.ok) { console.error('Pick rejected:', delta.error); return; }
            applyDelta(delta);
        } catch (err) {
            console.error('Pick failed:', err);
        } finally {
            submitting = false;
        }
    }

    async function handleAdvance() {
        if (draft.complete || submitting) return;
        submitting = true;
        try {
            const res = await fetch('/api/supabase/draft/advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'single' })
            });
            const delta = await res.json();
            if (!res.ok) { console.error('Advance failed:', delta.error); return; }
            applyDelta(delta);
        } catch (err) {
            console.error('Advance failed:', err);
        } finally {
            submitting = false;
        }
    }

    async function skipToPlayerPick() {
        if (draft.complete || submitting) return;
        submitting = true;
        try {
            const res = await fetch('/api/supabase/draft/advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'skip' })
            });
            const delta = await res.json();
            if (!res.ok) { console.error('Skip failed:', delta.error); return; }
            applyDelta(delta);
        } catch (err) {
            console.error('Skip failed:', err);
        } finally {
            submitting = false;
        }
    }

    // ============================================================
    // Rivals (cosmetic, client-side) — unchanged
    // ============================================================
    function assignRivals(firstName, bool, index) {
        clubsWithRivals[index] = clubsWithRivals[index] || [];
        if (clubsWithRivals[index].length >= 2) return;

        if (bool === true) {
            if (selectedNames[firstName]) {
                const foundRival = selectedNames[firstName];
                teams[`team${index}`].rivals.push({ name: foundRival.name, index: foundRival.index });
                clubsWithRivals[index].push(foundRival.index);
                teams[`team${foundRival.index}`].rivals.push({ name: teams[`team${index}`].name, index });
                clubsWithRivals[foundRival.index] = clubsWithRivals[foundRival.index] || [];
                clubsWithRivals[foundRival.index].push(index);
            }
            return;
        }

        const attempts = 3;
        for (let i = 0; i < attempts && clubsWithRivals[index].length < 2; i++) {
            const potentialRivalIndex = Math.floor(Math.random() * (draft.totalTeams - 1)) + 1;
            if (index === draft.totalTeams) {
                if ((clubsWithRivals[potentialRivalIndex] || []).length <= 1) {
                    playerTeam.rivals.push({ name: teams[`team${potentialRivalIndex}`].name, index: potentialRivalIndex });
                    teams[`team${potentialRivalIndex}`].rivals.push({ name: playerTeam.name, index: 0 });
                }
                clubsWithRivals[index].push(potentialRivalIndex);
                clubsWithRivals[potentialRivalIndex] = clubsWithRivals[potentialRivalIndex] || [];
                clubsWithRivals[potentialRivalIndex].push(index);
                return;
            }
            if (
                potentialRivalIndex === index ||
                clubsWithRivals[index].includes(potentialRivalIndex) ||
                (clubsWithRivals[potentialRivalIndex] || []).length >= 2
            ) continue;

            if (Math.random() < 0.5) {
                teams[`team${index}`].rivals.push({ name: teams[`team${potentialRivalIndex}`].name, index: potentialRivalIndex });
                teams[`team${potentialRivalIndex}`].rivals.push({ name: teams[`team${index}`].name, index });
                clubsWithRivals[index].push(potentialRivalIndex);
                clubsWithRivals[potentialRivalIndex] = clubsWithRivals[potentialRivalIndex] || [];
                clubsWithRivals[potentialRivalIndex].push(index);
            }
        }
    }
</script>

<div class="draft-main-container">
    {#if draft.gate1}
        <div class="draft-ticker-container">
            <DraftTicker ticker={draft} />
        </div>
    {/if}

    {#if draft.gate0 && !draft.gate1}
        <div class="create-teams-btn">
            <button
                onclick={draftSetup}
                disabled={submitting}
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6">
                {submitting ? 'Preparing…' : 'Create Teams and Prepare Draft'}
            </button>
        </div>
    {/if}

    {#if draft.gate1 && !draft.started}
        <div class="start-draft-btn">
            <button
                onclick={beginDraft}
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6">
                Start Draft
            </button>
        </div>
    {/if}

    {#if draft.started && !draft.complete}
        {#if draft.currentTeam !== playerTeam.name}
            <div class="draft-buttons">
                <button onclick={handleAdvance} disabled={submitting} class="advance-btn">
                    Advance Draft
                </button>
                <button onclick={skipToPlayerPick} disabled={submitting} class="skip-btn">
                    Skip to Next Player Pick
                </button>
            </div>
        {/if}
    {/if}
</div>

{#if !draft.complete}
    <div class="page-container">
        <div class="players-section">
            <h3>Total Players: {draft.availablePlayers.length}</h3>
            <div class="player-list">
                {#each draft.availablePlayers as player (player.id)}
                    <DraftPlayer {player} onDraft={(e) => handlePlayerPick(player, e)} />
                {/each}
            </div>
        </div>
        {#if draft.gate1}
            <div class="player-team-section">
                <PlayerDraftTeam team={playerTeam} />
            </div>
            <div class="ai-teams-section">
                <div class="teams-grid">
                    {#each Object.entries(teams).filter(([, team]) => team.name !== '').sort(([, a], [, b]) => a.draftOrder - b.draftOrder) as [key, team]}
                        <DraftTeam {team} />
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{:else}
    <h1>Draft Complete!</h1>
{/if}

<style>
    button {
        background-color: blue;
        color: white;
        padding: 1rem;
        margin-bottom: 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
    }
    button:hover { background-color: darkblue; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .page-container {
        display: flex;
        width: 100%;
        max-width: 2000px;
        margin: 0 auto;
        gap: 2rem;
        padding: 1rem;
        height: calc(100vh - 180px);
    }
    .players-section { flex: 0 0 40%; display: flex; flex-direction: column; gap: 1rem; }
    .player-list { flex: 1; overflow-y: auto; padding-right: 0.5rem; }
    .player-team-section { flex: 0 0 30%; }
    .ai-teams-section { flex: 0 0 30%; background-color: #f8fafc; }
    h3 { margin: 0; font-size: 1.5rem; font-weight: 600; color: #1e293b; }
</style>