import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
    console.log('Layout server load called for protected route');
    
    if (!isAuthenticated(cookies)) {
        console.log('Not authenticated in layout server load, redirecting');
        throw redirect(302, '/');
    }
    
    console.log('Authenticated in layout server load');
    return {};
};