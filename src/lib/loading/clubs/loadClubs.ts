import { clubsByID } from '$lib/stores/generic.svelte';
import axios from 'axios';

export async function loadClubsData(): Promise<boolean> {
    try {
        // Already loaded? skip (clubs rarely change within a session)
        if (Object.keys(clubsByID).length > 0) {
            console.log('Clubs already loaded, skipping...');
            return true;
        }

        const response = await axios.get('/api/supabase/clubs');
        const clubs = response.data.clubs;

        if (clubs && clubs.length > 0) {
            for (const club of clubs) {
                clubsByID[club.team_id] = club.name;
            }
            console.log(`Loaded ${clubs.length} clubs`);
            return true;
        }
        console.error('No clubs data found');
        return false;
    } catch (error) {
        console.error('Error loading clubs:', error);
        return false;
    }
}