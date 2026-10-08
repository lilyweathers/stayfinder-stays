import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.js";
import type { User } from "@supabase/supabase-js";

export type BasicSupabaseClient = ReturnType<typeof createServerClient<Database>>;

declare module "hono" {
  interface ContextVariableMap {
    supabase: BasicSupabaseClient;
    user: User | null;
  }
}
