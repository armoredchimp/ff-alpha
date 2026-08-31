import { supabase, supabaseScaling } from '$lib/server/supaClient';
import { fail } from '@sveltejs/kit';
import { updateSession, getSession, getIdToken } from '$lib/server/auth';
import { generateLeagueSchedule } from '$lib/utils/league';
import { AWS_REGISTER_LEAGUE_URL } from '$env/static/private';
import type { Actions } from './$types';

interface League {
    league_id: string;
    creator: string;
    league_name: string;
    total_teams: number;
    countries_code: number;
    draft_complete: boolean;
}

const maxGames = {
    1: 38,
    2: 38,
    3: 34,
    4: 34,
    5: 38
};

export const actions: Actions = {
    createLeague: async ({ request, cookies }) => {
        const session = getSession(cookies);
        if (!session) {
            return fail(401, { error: 'Not authenticated' });
        }

        const idToken = getIdToken(cookies);
        if (!idToken) {
            return fail(401, { error: 'No valid token — please sign in again' });
        }

        const data = await request.formData();
        const leagueName = data.get('leagueName') as string;
        if (!leagueName?.trim()) {
            return fail(400, { error: 'Please enter a league name' });
        }
        const selectedTeams = parseInt(data.get('selectedTeams') as string, 10);
        const creationToken = data.get('creationToken') as string;
        if (!creationToken) {
            return fail(403, { error: 'Not authorized to create a league' });
        }
        const countriesCode = parseInt(data.get('countriesCode') as string, 10);
        if (!countriesCode || countriesCode < 1 || countriesCode > 5) {
            return fail(400, { error: 'Invalid country selection' });
        }

        const schedule = generateLeagueSchedule(selectedTeams, maxGames[countriesCode]);

        let createdLeagueId: string | null = null;

        try {
            const { data: weekRow, error: league_weekError } = await supabase
                .from('league_info_reference')
                .select('league_week')
                .eq('countries_code', countriesCode)
                .single();

            if (league_weekError) {
                console.error('Error retrieving league week after league creation');
            }

            const leagueWeek = weekRow?.league_week ?? null;

            // 1. Create the league
            const { data: league, error: supabaseError } = await supabaseScaling
                .from('leagues')
                .insert({
                    creator: session.userId,
                    league_name: leagueName,
                    total_teams: selectedTeams,
                    countries_code: countriesCode,
                    draft_complete: false,
                    schedule: schedule
                })
                .select()
                .single<League>();

            if (supabaseError || !league) {
                console.error('Supabase error:', supabaseError);
                return fail(500, { error: 'Failed to create league in database' });
            }

            createdLeagueId = league.league_id;

            // 2. Record membership. The league id never leaves the server.
            const { error: memberError } = await supabaseScaling
                .from('league_members')
                .insert({
                    user_id: session.userId,
                    league_id: league.league_id,
                    role: 'commissioner'
                });

            if (memberError) {
                console.error('league_members insert failed:', memberError);
                await rollback(createdLeagueId);
                return fail(500, { error: 'Failed to register league membership' });
            }

            // 3. Claim the creation token in DynamoDB (one league per user)
            const registerRes = await fetch(AWS_REGISTER_LEAGUE_URL, {
                method: 'PUT',
                headers: {
                    'Authorization': idToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leagueId: league.league_id,
                    creationToken
                })
            });

            if (!registerRes.ok) {
                const detail = await registerRes.text();
                console.error('League registration failed:', registerRes.status, detail);
                await rollback(createdLeagueId);

                if (registerRes.status === 403) {
                    return fail(403, {
                        error: 'Your session expired or you already have a league. Please refresh and try again.'
                    });
                }
                return fail(500, { error: 'Failed to register league' });
            }

            // 4. Only now is the league real — update the session
            const updated = await updateSession(cookies, { leagueId: league.league_id });
            if (!updated) {
                console.error('Failed to update session with league ID');
            }

            return {
                success: true,
                league: {
                    id: league.league_id,
                    name: league.league_name,
                    totalTeams: league.total_teams,
                    countriesCode: league.countries_code,
                    schedule: schedule,
                    leagueWeek: leagueWeek
                }
            };

        } catch (error) {
            console.error('Error creating league:', error);
            if (createdLeagueId) await rollback(createdLeagueId);
            return fail(500, { error: 'Failed to create league' });
        }
    }
};

/** Undo a partial creation. league_members cascades via the FK. */
async function rollback(leagueId: string) {
    const { error } = await supabaseScaling
        .from('leagues')
        .delete()
        .eq('league_id', leagueId);

    if (error) {
        console.error('Rollback failed — orphaned league:', leagueId, error);
    }
}