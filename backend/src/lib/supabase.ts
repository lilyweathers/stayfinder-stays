import { env } from "../env.js";

// Only a publishable/anon key: service-role keys bypass RLS.
export const supabaseUrl = env.supabaseUrl;
export const supabaseKey = env.supabaseKey;
