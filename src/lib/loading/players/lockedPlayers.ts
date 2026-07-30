import axios from "axios";
import { lockedPlayers, lockedPlayerScores } from "$lib/stores/generic.svelte";
import { playerTeam } from "$lib/stores/teams.svelte";
import { getMatchweek } from "$lib/stores/league.svelte";

export async function loadLockedPlayers(): Promise<boolean> {
    try {
        const res = await axios.get('/api/supabase/locked_players');
        const ids: number[] = res.data.lockedPlayers ?? [];
        lockedPlayers.clear();
        for (const id of ids) lockedPlayers.add(id);
        return true;
    } catch (err) {
        console.error('Failed to load locked players:', err);
        return false;
    }
}

export async function getLockedPlayerScores(
    playerIds: number[],
    leagueWeek: number
): Promise<Record<number, any[]>> {
    if (!playerIds || playerIds.length === 0) return {};

    try {
        const res = await axios.get('/api/supabase/locked_player_scores', {
            params: {
                player_ids: playerIds.join(','),
                league_week: leagueWeek
            }
        });
        return res.data.scores ?? {};
    } catch (err) {
        console.error('Error fetching locked player scores:', err);
        return {};
    }
}

export async function loadLockedFixtureData() {
    // roster player ids that are locked
    const rosterIds = [
        ...playerTeam.attackers, ...playerTeam.midfielders,
        ...playerTeam.defenders, ...playerTeam.keepers
    ].map((p: any) => (typeof p === 'number' ? p : p?.id)).filter(Boolean);

    const lockedRoster = rosterIds.filter((id) => lockedPlayers.has(id));
    if (lockedRoster.length === 0) return;

    const scores = await getLockedPlayerScores(lockedRoster, getMatchweek());
    // fill the store
    for (const [pid, rows] of Object.entries(scores)) {
        lockedPlayerScores[Number(pid)] = rows;
    }
}