import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from '$lib/server/supaClient';

const WEIGHT_TABLES = [
    'getDefensiveScore',
    'getKeeperScore',
    'getPossessionScore',
    'getPassingScore',
    'getAttackingScore',
    'getFinishingScore'
] as const;

export const GET: RequestHandler = async ({ cookies }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = await Promise.all(
            WEIGHT_TABLES.map((table) => supabase.from(table).select('*'))
        );

        const weights: Record<string, any[]> = {};

        for (let i = 0; i < WEIGHT_TABLES.length; i++) {
            const table = WEIGHT_TABLES[i];
            const { data, error } = results[i];

            if (error) {
                console.error(`Error fetching weights from ${table}:`, error);
                return json({ error: `Failed to load weights from ${table}` }, { status: 500 });
            }

            weights[table] = data ?? [];
        }

        return json({ weights });
    } catch (err) {
        console.error('Weights fetch error:', err);
        return json({ error: 'Failed to fetch weights' }, { status: 500 });
    }
};