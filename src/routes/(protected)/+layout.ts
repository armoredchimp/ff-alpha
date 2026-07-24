import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

interface SessionData {
    userId: string;
    leagueId: string | null; 
}

interface ParentData {
    session: SessionData | null;
}

export const load: LayoutLoad = async ({ parent, url }) => {
    const data = await parent() as ParentData;
    
    console.log('Protected layout - session:', data.session); 
    console.log('Protected layout - URL:', url.pathname); 
    
    if (browser) {
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
};