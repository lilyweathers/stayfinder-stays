import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export type BasicSupabaseClient = ReturnType<typeof createServerClient>;

declare module "hono" {
  interface ContextVariableMap {
    supabase: BasicSupabaseClient;
    user: User | null;
  }
}
