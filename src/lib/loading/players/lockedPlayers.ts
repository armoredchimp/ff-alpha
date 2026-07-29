import axios from "axios";
import { lockedPlayers } from "$lib/stores/generic.svelte";

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
