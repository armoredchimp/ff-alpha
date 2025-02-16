import { createClient } from "@supabase/supabase-js";

const supabaseURL = import.meta.env.VITE_DB_URL
const supabaseKey = import.meta.env.VITE_DB_API_KEY


export const supabase = createClient(supabaseURL, supabaseKey)