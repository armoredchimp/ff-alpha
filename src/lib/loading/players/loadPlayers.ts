import { allPlayers, playersByID } from '$lib/stores/generic.svelte';
import axios from 'axios';
import type { Player } from '$lib/types/types';

export async function loadPlayersData(): Promise<boolean> {
    try {
        if (allPlayers.length > 0) {
            console.log('Players already loaded, skipping...');
            return true;
        }
       
        const response = await axios.get<{ players: Player[] }>('/api/supabase/players');
       
        if (response.data.players && response.data.players.length > 0) {
            allPlayers.length = 0;
           
            for (const player of response.data.players) {
                allPlayers.push(player);
            }
           
            // Create KVP object for quick lookups
            for (const player of response.data.players) {
                playersByID[player.id] = player;
            }
           
            console.log(`Loaded ${response.data.players.length} players`);
            console.log(JSON.parse(JSON.stringify(allPlayers)))
            console.log('playersByID:', JSON.parse(JSON.stringify(playersByID)));
            return true;
        }
       
        return false;
    } catch (error) {
        console.error('Error loading players:', error);
        return false;
    }
}