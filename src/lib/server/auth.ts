import type { Cookies } from "@sveltejs/kit";

export interface SessionData {
    userId: string;
    username: string;
    leagueId: string | null;
    timestamp: number;
}

export function getSession(cookies: Cookies): SessionData | null {
    try {
        const sessionCookie = cookies.get('auth-session');
        if (!sessionCookie) return null;
        
        const sessionData = JSON.parse(sessionCookie) as SessionData;
        
        // Check if session is expired
        const maxAge = 60 * 60 * 24 * 7 * 1000; // 7 days in ms
        if (Date.now() - sessionData.timestamp > maxAge) {
            return null;
        }
        
        return sessionData;
    } catch {
        return null;
    }
}

export function isAuthenticated(cookies: Cookies): boolean {
    return getSession(cookies) !== null;
}

export function hasLeague(cookies: Cookies): boolean {
    const session = getSession(cookies);
    return session !== null && session.leagueId !== null;
}

export function getLeagueId(cookies: Cookies): string | null {
    const session = getSession(cookies);
    return session?.leagueId || null;
}

export async function updateSession(cookies: Cookies, updates: Partial<SessionData>): Promise<boolean> {
    try {
        const session = getSession(cookies);
        if (!session) return false;
        
        const updatedSession = {
            ...session,
            ...updates,
            timestamp: Date.now()
        };
        
        cookies.set('auth-session', JSON.stringify(updatedSession), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });
        
        return true;
    } catch {
        return false;
    }
}