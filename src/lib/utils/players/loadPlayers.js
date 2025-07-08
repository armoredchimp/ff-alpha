import { allPlayers, playersByID } from '$lib/stores/generic.svelte';
import axios from 'axios';

export async function loadPlayersData() {
    try {
        if (allPlayers.length > 0) {
            console.log('Players already loaded, skipping...');
            return true;
        }
        
        const response = await axios.get('/api/supabase/players');
        
        if (response.data.players && response.data.players.length > 0) {
            allPlayers.length = 0;
            
            for (const player of response.data.players) {
                allPlayers.push(player);
            }
            
            // Create KVP object for quick lookups
            for (const player of response.data.players) {
                playersByID[player.player_id] = player;
            }
            
            console.log(`Loaded ${response.data.players.length} players`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error loading players:', error);
        return false;
    }
}