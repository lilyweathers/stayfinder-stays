import { createServerClient } from "@supabase/ssr";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { env } from "../env.js";
import { supabaseKey, supabaseUrl } from "../lib/supabase.js";
import type { Database } from "../types/database.js";
import type { BasicSupabaseClient } from "../types/supabase.js";

export function createSupabaseForRequest(c: Context): BasicSupabaseClient {
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => Object.entries(getCookie(c)).map(([name, value]) => ({ name, value })),
      setAll(cookiesToSet) {
        c.header("Cache-Control", "private, no-store");
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, {
            domain: options.domain,
            expires: options.expires,
            maxAge: options.maxAge,
            httpOnly: true,
            secure: env.nodeEnv === "production",
            sameSite: "lax",
            path: "/",
          });
        });
      },
    },
  });
}

async function setSupabaseContext(c: Context) {
  if (c.get("supabase") as BasicSupabaseClient | undefined) return;
  const supabase = createSupabaseForRequest(c);
  c.set("supabase", supabase);
  // getUser verifies identity and lets SSR refresh tokens through the cookie adapter.
  const { data: { user }, error } = await supabase.auth.getUser();
  c.set("user", error ? null : user);
}

export async function optionalAuth(c: Context, next: Next) {
  c.header("Cache-Control", "private, no-store");
  await setSupabaseContext(c);
  await next();
}

export async function requireAuth(c: Context, next: Next) {
  await setSupabaseContext(c);
  if (!c.get("user")) throw new HTTPException(401, { message: "Unauthorized" });
  await next();
}
