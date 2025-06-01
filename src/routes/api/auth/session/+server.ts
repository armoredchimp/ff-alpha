import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { userId, username } = await request.json();

        if (!userId || !username) {
            return json({ error: 'Invalid user data' }, { status: 400 })
        } 

        cookies.set('auth-session', JSON.stringify({
            userId,
            username,
            timestamp: Date.now()
        }), {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });

        return json({ success: true });
    } catch(err){
        console.error('Session created error: ', err)
        return json({ error: 'Failed to create session' }, { status: 500})
    }
}

export const DELETE: RequestHandler = async ({ cookies }) => {
    cookies.delete('auth-session', { path: '/' });
    return json({ success: true })
}