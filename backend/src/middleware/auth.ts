import { createServerClient } from "@supabase/ssr";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { env } from "../env.js";
import { supabaseKey, supabaseUrl } from "../lib/supabase.js";
import type { Database } from "../types/database.js";
import type { BasicSupabaseClient } from "../types/supabase.js";

export function createSupabaseForRequest(c: Context): BasicSupabaseClient {
  // Vg1: Använd förfrågans sessionscookies så att databasanrop görs med
  // användarens identitet och omfattas av databasens RLS-regler.
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
  // Vg1: Supabase verifierar identiteten. Vi litar inte på ett användar-ID
  // från formuläret. Den verifierade användaren sparas i förfrågans kontext.
  const { data: { user }, error } = await supabase.auth.getUser();
  c.set("user", error ? null : user);
}

export async function optionalAuth(c: Context, next: Next) {
  c.header("Cache-Control", "private, no-store");
  await setSupabaseContext(c);
  await next();
}

export async function requireAuth(c: Context, next: Next) {
  // Inloggning krävs, men varje åtgärd måste också kontrollera behörigheten
  // till det aktuella boendet eller bokningen i rutten och databasen.
  await setSupabaseContext(c);
  if (!c.get("user")) throw new HTTPException(401, { message: "Unauthorized" });
  await next();
}
