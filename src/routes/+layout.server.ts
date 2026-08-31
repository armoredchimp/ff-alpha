import { getSession } from '$lib/server/auth';

export async function load({ cookies }) {
    const session = getSession(cookies);

    return {
        session: session ? {
            userId: session.userId,
            username: session.username,
            leagueId: session.leagueId
        } : null
    };
}