import type { Cookies } from "@sveltejs/kit";

export interface SessionData {
    userId: string;
    username: string;
    timestamp: number;
}

export function getSession(cookies: Cookies): SessionData | null {
    try {
        const sessionCookie = cookies.get('auth-session');
        if (!sessionCookie) return null;

        const sessionData = JSON.parse(sessionCookie) as SessionData;

        const maxAge = 60 * 60 * 24 * 7 * 1000;
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