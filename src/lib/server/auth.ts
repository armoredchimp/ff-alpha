import type { Cookies } from "@sveltejs/kit";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { COGNITO_ISSUER, COGNITO_CLIENT_ID } from '$env/static/private';

export interface SessionData {
    userId: string;
    username: string;
    leagueId: string | null;
    idToken: string;
    timestamp: number;
}

const JWKS = createRemoteJWKSet(new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`));

/** Verifies a Cognito ID token. Returns claims, or null if invalid/expired. */
export async function verifyIdToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: COGNITO_ISSUER,
            audience: COGNITO_CLIENT_ID
        });
        if (payload.token_use !== 'id') return null;
        return payload;
    } catch (err) {
        console.error('ID token verification failed:', err);
        return null;
    }
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

/** The trustworthy path: verifies the stored token and returns its claims. */
export async function requireUser(cookies: Cookies) {
    const session = getSession(cookies);
    if (!session?.idToken) return null;
    const claims = await verifyIdToken(session.idToken);
    if (!claims) return null;
    return { sub: claims.sub as string, claims, idToken: session.idToken };
}

export function getIdToken(cookies: Cookies): string | null {
    return getSession(cookies)?.idToken ?? null;
}

export function isAuthenticated(cookies: Cookies): boolean {
    return getSession(cookies) !== null;
}

export function hasLeague(cookies: Cookies): boolean {
    const session = getSession(cookies);
    return session !== null && session.leagueId !== null;
}

export function getLeagueId(cookies: Cookies): string | null {
    return getSession(cookies)?.leagueId || null;
}

export async function updateSession(cookies: Cookies, updates: Partial<SessionData>): Promise<boolean> {
    try {
        const session = getSession(cookies);
        if (!session) return false;

        cookies.set('auth-session', JSON.stringify({
            ...session,
            ...updates,
            timestamp: Date.now()
        }), {
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