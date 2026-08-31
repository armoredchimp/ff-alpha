import { fetchAuthSession } from 'aws-amplify/auth';

let inFlight: Promise<void> | null = null;

/**
 * Pushes a current ID token to the server session. Amplify refreshes the
 * token automatically if it's near expiry, so this always sends a valid one.
 * Safe to call often — concurrent calls share one request.
 */
export async function refreshServerToken(): Promise<void> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();
            if (!idToken) return;

            await fetch('/api/auth/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
        } catch (err) {
            console.error('Token refresh failed:', err);
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}