import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { userId, username, leagueId } = await request.json();
        
        if (!userId || !username) {
            return json({ error: 'Invalid user data' }, { status: 400 });
        }
        
        const sessionData = {
            userId,
            username,
            leagueId: leagueId || null, 
            timestamp: Date.now()
        };
        
        cookies.set('auth-session', JSON.stringify(sessionData), {
            path: '/',
            httpOnly: true,
            secure: false, 
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });
        
        return json({ success: true });
    } catch(err) {
        console.error('Session creation error: ', err);
        return json({ error: 'Failed to create session' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request, cookies }) => {
    try {
        const updates = await request.json();
        const sessionCookie = cookies.get('auth-session');
        
        if (!sessionCookie) {
            return json({ error: 'No session found' }, { status: 401 });
        }
        
        const currentSession = JSON.parse(sessionCookie);
        const updatedSession = {
            ...currentSession,
            ...updates,
            timestamp: Date.now() 
        };
        
        cookies.set('auth-session', JSON.stringify(updatedSession), {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });
        
        return json({ success: true, session: updatedSession });
    } catch(err) {
        console.error('Session update error: ', err);
        return json({ error: 'Failed to update session' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ cookies }) => {
    cookies.delete('auth-session', { path: '/' });
    return json({ success: true });
};