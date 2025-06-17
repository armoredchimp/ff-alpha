import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

export async function load({ parent, url }) {
    // Get data from parent layout
    const data = await parent();
    
    console.log('Protected layout - session:', data.session); // Debug log
    console.log('Protected layout - URL:', url.pathname); // Debug log
    
    // Only do client-side checks if we're in the browser
    // Server-side checks are handled by hooks.server.ts
    if (browser) {
        // Check if user is authenticated
        if (!data.session) {
            console.log('No session found, redirecting to login');
            throw redirect(302, '/');
        }
        
        // Check if user needs a league (except for /create route)
        if (url.pathname !== '/create' && !data.session.leagueId) {
            console.log('No league ID found, redirecting to create');
            throw redirect(302, '/create');
        }
    }
    
    return data;
}