import { fixturesByID } from '$lib/stores/generic.svelte';
import { getSeasonID } from '$lib/stores/league.svelte';
import axios from 'axios';

export async function loadFixturesData(): Promise<boolean> {
    try {
        if (Object.keys(fixturesByID).length > 0) {
            console.log('Fixtures already loaded, skipping...');
            return true;
        }

        const seasonId = getSeasonID();
        if (seasonId == null) {
            console.error('No season id set — cannot load fixtures');
            return false;
        }

        const response = await axios.get('/api/supabase/fixtures', {
            params: { season_id: seasonId }
        });
        const fixtures = response.data.fixtures;

        if (fixtures && fixtures.length > 0) {
            for (const fixture of fixtures) {
                fixturesByID[fixture.fixture_id] = fixture;   // ✅ fixture, not fixtures
            }
            console.log(`Loaded ${fixtures.length} fixtures`);
        } else {
            console.log('No fixtures for this season yet');
        }
        return true;   // empty is a valid load, not a failure
    } catch (error) {
        console.error('Error loading fixtures:', error);
        return false;
    }
}