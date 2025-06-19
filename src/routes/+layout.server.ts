import { getSession } from '$lib/server/auth';

export async function load({ cookies }) {
    const session = getSession(cookies);
    
    console.log('Root layout server - session:', session); // Debug log
    
    return {
        session: session ? {
            userId: session.userId,
            username: session.username,
            leagueId: session.leagueId
        } : null
    };
}