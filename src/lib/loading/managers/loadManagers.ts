import { managers, managersByID } from '$lib/stores/generic.svelte';
import axios from 'axios';
import type { Manager } from '$lib/types/types';

export async function loadManagersData(): Promise<boolean> {
    try {
        if (managers.length > 0) {
            console.log('Managers already loaded, skipping...');
            return true;
        }
        
        const response = await axios.get<{ managers: Manager[] }>('/api/supabase/managers');
       
        if (response.data.managers && response.data.managers.length > 0) {
            managers.length = 0;
           
            // Populate managers
            for (const manager of response.data.managers) {
                managers.push(manager);
            }
           
            for (const manager of response.data.managers) {
                managersByID[manager.id] = manager;
            }
            
            console.log(`Loaded ${response.data.managers.length} managers`);
            console.log(JSON.parse(JSON.stringify(managersByID)));
            return true;
        }
       
        return false;
    } catch (error) {
        console.error('Error loading managers:', error);
        return false;
    }
}