import { allPlayers, playersByID } from '$lib/stores/generic.svelte';
import axios from 'axios';
import type { Player } from '$lib/types/types';

export async function loadPlayersData(countriesCode: number): Promise<boolean> {
    try {
        if (allPlayers.length > 0) {
            console.log('Players already loaded, skipping...');
            return true;
        }
        
        // Pass the countries code as a query parameter
        const response = await axios.get<{ players: Player[] }>('/api/supabase/players', {
            params: countriesCode ? { countriesCode } : {}
        });
        
        // Load injuries from injuries endpoint
        const injuriesResponse = await axios.get('/api/supabase/injuries');
        if (injuriesResponse.data.injuries) {
            console.log(`Loaded ${injuriesResponse.data.injuries.length} injuries`);
        } else {
            console.error('No injuries data found');
        }

        if (response.data.players && response.data.players.length > 0 && injuriesResponse.data.injuries) {
            allPlayers.length = 0;
            
            // Match injuries to players and add injury info to player objects

            const injuries = injuriesResponse.data.injuries;
            // Create a map of injuries by injuries.player_id for quick lookup
            const injuriesByPlayerId: Record<number, any> = {};
            for (const injury of injuries) {
                injuriesByPlayerId[injury.player_id] = injury;
            }

            for (const player of response.data.players) {
                if( injuriesByPlayerId[player.id]) {
                    const injury = injuriesByPlayerId[player.id];
                    player.injured = {
                        category: injury.category,
                        start_date: injury.start_date
                    }
                }
                allPlayers.push(player);
            }
            
            // Create KVP object for quick lookups
            for (const player of allPlayers) {
                playersByID[player.id] = player;
            }
            
            console.log(`Loaded ${response.data.players.length} players from countries code ${countriesCode || 1}`);
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