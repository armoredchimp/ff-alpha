import { createClient } from "@supabase/supabase-js";

const supabaseURL = import.meta.env.VITE_DB_URL
const supabaseKey = import.meta.env.VITE_DB_SERVICE_KEY
const supabaseScalingURL = import.meta.env.VITE_DB_SCALING_URL
const supabaseScalingKey = import.meta.env.VITE_DB_SCALING_SERVICE_KEY


export const supabase = createClient(supabaseURL, supabaseKey)
export const supabaseScaling = createClient(supabaseScalingURL, supabaseScalingKey)