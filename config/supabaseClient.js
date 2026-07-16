import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // important

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey ? "✅ Loaded" : "❌ Missing");

export const supabase = createClient(supabaseUrl, supabaseKey);