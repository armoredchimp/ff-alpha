import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { verifyIdToken } from "$lib/server/auth";

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { idToken, leagueId } = await request.json();

        if (!idToken) {
            return json({ error: 'Missing ID token' }, { status: 400 });
        }

        const claims = await verifyIdToken(idToken);
        if (!claims) {
            return json({ error: 'Invalid token' }, { status: 401 });
        }

        // Identity comes from the verified token, never the request body.
        const sessionData = {
            userId: claims.sub as string,
            username: (claims.email as string) ?? '',
            leagueId: leagueId || null,
            idToken,
            timestamp: Date.now()
        };

        cookies.set('auth-session', JSON.stringify(sessionData), {
            path: '/',
            httpOnly: true,
            secure: false,   // set true in production
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });

        return json({ success: true });
    } catch (err) {
        console.error('Session creation error: ', err);
        return json({ error: 'Failed to create session' }, { status: 500 });
    }
};

/** Refresh the stored token. Only accepts a token — nothing else is settable. */
export const PATCH: RequestHandler = async ({ request, cookies }) => {
    try {
        const { idToken } = await request.json();
        if (!idToken) {
            return json({ error: 'Missing ID token' }, { status: 400 });
        }

        const claims = await verifyIdToken(idToken);
        if (!claims) {
            return json({ error: 'Invalid token' }, { status: 401 });
        }

        const sessionCookie = cookies.get('auth-session');
        if (!sessionCookie) {
            return json({ error: 'No session found' }, { status: 401 });
        }

        const current = JSON.parse(sessionCookie);
        if (current.userId !== claims.sub) {
            return json({ error: 'Token does not match session' }, { status: 403 });
        }

        cookies.set('auth-session', JSON.stringify({
            ...current,
            idToken,
            timestamp: Date.now()
        }), {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });

        return json({ success: true });
    } catch (err) {
        console.error('Session update error: ', err);
        return json({ error: 'Failed to update session' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ cookies }) => {
    cookies.delete('auth-session', { path: '/' });
    return json({ success: true });
};