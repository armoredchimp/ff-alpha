import axios from "axios";
import { redirect, type Handle } from "@sveltejs/kit";
import { isAuthenticated, hasLeague, getSession } from "$lib/server/auth";

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const CORE_URL = 'https://api.sportmonks.com/v3/core';
const API_TOKEN = import.meta.env.VITE_SPORTSMONK_KEY;

export const handle: Handle = async ({ event, resolve }) => {
    console.log('=== HOOK CALLED ===');
    console.log('URL:', event.url.pathname);
    console.log('Route ID:', event.route.id);
    
    // Handle .well-known requests
    if (event.url.pathname.includes('.well-known')) {
        return new Response('Not Found', { status: 404 });
    }
    
    // Handle API proxy routes for SportMonks
    if (event.url.pathname.startsWith('/api/teams') || 
        event.url.pathname.startsWith('/api/players') || 
        event.url.pathname.startsWith('/api/coaches')) {
        try {
            const endpoint = event.url.pathname.replace('/api','');
            const queryParams = new URLSearchParams(event.url.searchParams);
            queryParams.set('api_token', API_TOKEN);
            
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                params: queryParams
            });
            
            return new Response(JSON.stringify(response.data), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch(err) {
            console.error('Error fetching data: ', err);
            return new Response(JSON.stringify({error: err.message}), {
                status: err.response?.status || 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } else if (event.url.pathname.startsWith('/api/core')) {
        try {
            const endpoint = event.url.pathname.replace('/api/core','');
            const queryParams = new URLSearchParams(event.url.searchParams);
            queryParams.set('api_token', API_TOKEN);
            
            const response = await axios.get(`${CORE_URL}${endpoint}`, {
                params: queryParams
            });
            
            return new Response(JSON.stringify(response.data), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch(err) {
            console.error('Error fetching data: ', err);
            return new Response(JSON.stringify({error: err.message}), {
                status: err.response?.status || 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // Protected route checking
    console.log('Checking protection...');
    const rootDirName = event.route.id?.split('/')[1] || '';
    console.log('Root dir name:', rootDirName);
    
    const protectedDirName = '(protected)';
    

if (rootDirName === protectedDirName) {
    console.log('This is a protected route, checking auth...');
    
    const session = getSession(event.cookies);
    console.log('Session in hooks:', session); // Debug log
    
    // First check if user is authenticated at all
    if (!isAuthenticated(event.cookies)) {
        console.log('User not authenticated, redirecting to login...');
        throw redirect(302, '/');
    }
    
    // User is authenticated, now check if they need a league
    // Exception: /create route doesn't require a league
    if (event.url.pathname !== '/create' && !hasLeague(event.cookies)) {
        console.log('User has no league, redirecting to create...');
        console.log('Path:', event.url.pathname);
        console.log('Has league:', hasLeague(event.cookies));
        throw redirect(302, '/create');
    }
    
    console.log('User authenticated and has appropriate access');
} else {
        console.log('Not a protected route');
    }
    
    console.log('=== HOOK FINISHED ===');
    return resolve(event);
};