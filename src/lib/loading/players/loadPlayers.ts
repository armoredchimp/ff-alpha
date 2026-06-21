import { allPlayers, playersByID, injuredByTeam } from '$lib/stores/generic.svelte';
import axios from 'axios';
import type { Player } from '$lib/types/types';

export async function loadPlayersData(countriesCode: number): Promise<boolean> {
    try {
        if (allPlayers.length > 0) {
            console.log('Players already loaded, skipping...');
            return true;
        }

        // Fetch players, injuries, and upcoming fixtures in parallel
        const [response, injuriesResponse, fixturesResponse] = await Promise.all([
            axios.get<{ players: Player[] }>('/api/supabase/players', {
                params: countriesCode ? { countriesCode } : {}
            }),
            axios.get('/api/supabase/injuries'),
            axios.get('/api/supabase/upcoming_fixtures')
        ]);

        if (injuriesResponse.data.injuries) {
            console.log(`Loaded ${injuriesResponse.data.injuries.length} injuries`);
        } else {
            console.error('No injuries data found');
        }

        if (response.data.players && response.data.players.length > 0 && injuriesResponse.data.injuries) {
            allPlayers.length = 0;

            // --- Build lookup maps ---
            const injuries = injuriesResponse.data.injuries;
            const injuriesByPlayerId: Record<number, any> = {};
            for (const injury of injuries) {
                injuriesByPlayerId[injury.player_id] = injury;
            }

            // upcoming fixtures: 1-2 rows per player -> group into arrays
            const fixtures = fixturesResponse.data.fixtures || [];
            const fixturesByPlayerId: Record<number, any[]> = {};
            for (const fx of fixtures) {
                if (!fixturesByPlayerId[fx.player_id]) fixturesByPlayerId[fx.player_id] = [];
                fixturesByPlayerId[fx.player_id].push({
                    fixture_id: fx.fixture_id,
                    team_id: fx.team_id,
                    opponent_team_id: fx.opponent_team_id,
                    is_home: fx.is_home,
                    kickoff: fx.kickoff
                });
            }
            console.log(`Loaded ${fixtures.length} upcoming fixture rows`);

            // --- Stitch onto player objects ---
            for (const player of response.data.players) {
                if (injuriesByPlayerId[player.id]) {
                    const injury = injuriesByPlayerId[player.id];
                    player.injured = {
                        category: injury.category,
                        start_date: injury.start_date
                    };
                }
                if (fixturesByPlayerId[player.id]) {
                    // sort by kickoff so the two fixtures are in chronological order
                    player.upcomingFixtures = fixturesByPlayerId[player.id]
                        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
                }
                allPlayers.push(player);
            }

            // --- Group injured/suspended by team (once, after the loop) ---
            const grouped: Record<string, Player[]> = {};
            for (const player of allPlayers) {
                if (player.injured?.category === 'injury' || player.injured?.category === 'suspended') {
                    const team = player.player_team || 'Unknown';
                    if (!grouped[team]) grouped[team] = [];
                    grouped[team].push(player);
                }
            }
            Object.assign(injuredByTeam, grouped);

            // --- KVP lookup ---
            for (const player of allPlayers) {
                playersByID[player.id] = player;
            }

            console.log(`Loaded ${response.data.players.length} players from countries code ${countriesCode || 1}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading players:', error);
        return false;
    }
}