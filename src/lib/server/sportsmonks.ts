import { SPORTSMONK_KEY } from '$env/static/private';

const FOOTBALL_URL = 'https://api.sportmonks.com/v3/football';
const CORE_URL = 'https://api.sportmonks.com/v3/core';

export async function sportsmonksGet(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${FOOTBALL_URL}${endpoint}`);
    url.searchParams.set('api_token', SPORTSMONK_KEY);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(`SportMonks API error: ${response.status}`);
    }

    return response.json();
}

export async function sportsmonksCoreGet(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${CORE_URL}${endpoint}`);
    url.searchParams.set('api_token', SPORTSMONK_KEY);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(`SportMonks Core API error: ${response.status}`);
    }

    return response.json();
}