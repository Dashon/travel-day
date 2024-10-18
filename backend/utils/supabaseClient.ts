import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
