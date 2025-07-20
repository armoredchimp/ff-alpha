import { managers } from '$lib/stores/generic.svelte';
import axios from 'axios';

export async function loadManagersData() {
    try {
        if (managers.length > 0) {
            console.log('Managers already loaded, skipping...');
            return true;
        }

        const response = await axios.get('/api/supabase/managers');
        
        if (response.data.managers && response.data.managers.length > 0) {
            managers.length = 0;
            
            // Populate managers
            for (const manager of response.data.managers) {
                managers.push(manager);
            }
            
            console.log(`Loaded ${response.data.managers.length} managers`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error loading managers:', error);
        return false;
    }
}