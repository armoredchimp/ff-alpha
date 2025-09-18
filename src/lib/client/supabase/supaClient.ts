import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseURL = import.meta.env.VITE_DB_URL as string;
const supabaseKey = import.meta.env.VITE_DB_SERVICE_KEY as string;
const supabaseScalingURL = import.meta.env.VITE_DB_SCALING_URL as string;
const supabaseScalingKey = import.meta.env.VITE_DB_SCALING_SERVICE_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseURL, supabaseKey);
export const supabaseScaling: SupabaseClient = createClient(supabaseScalingURL, supabaseScalingKey);