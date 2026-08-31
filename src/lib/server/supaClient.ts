import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    DB_URL,
    DB_SERVICE_KEY,
    DB_SCALING_URL,
    DB_SCALING_SERVICE_KEY,
    DB_API_KEY,
    DB_SCALING_API_KEY
} from '$env/static/private';

/**
 * Service-key clients. Bypass RLS entirely. Use only for trusted work with no
 * user request behind it — jobs, admin, and writes that must not be scoped.
 */
export const supabase: SupabaseClient = createClient(DB_URL, DB_SERVICE_KEY);
export const supabaseScaling: SupabaseClient = createClient(DB_SCALING_URL, DB_SCALING_SERVICE_KEY);

/**
 * Request-scoped clients. Carry the user's Cognito ID token, so RLS applies.
 * Build a fresh one per request — never cache these.
 */
export function refClientFor(idToken: string): SupabaseClient {
    return createClient(DB_URL, DB_API_KEY, {
        global: { headers: { Authorization: `Bearer ${idToken}` } }
    });
}

export function leagueClientFor(idToken: string): SupabaseClient {
    return createClient(DB_SCALING_URL, DB_SCALING_API_KEY, {
        global: { headers: { Authorization: `Bearer ${idToken}` } }
    });
}