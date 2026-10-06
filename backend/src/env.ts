import dotenv from "dotenv";

dotenv.config();

function getEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getEnv("SUPABASE_URL"),
  supabaseKey: getEnv("SUPABASE_KEY"),
  honoPort: Number(process.env.HONO_PORT) || 3000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  nodeEnv: process.env.NODE_ENV || "development"
};

// A privileged key would bypass the lesson's RLS policies.
let keyRole: string | undefined;
if (env.supabaseKey.split(".").length === 3) {
  try {
    keyRole = JSON.parse(Buffer.from(env.supabaseKey.split(".")[1]!, "base64url").toString()).role;
  } catch {
    throw new Error("SUPABASE_KEY must be a valid publishable or anon key");
  }
}
if (env.supabaseKey.startsWith("sb_secret_") || (keyRole && keyRole !== "anon")) {
  throw new Error("SUPABASE_KEY must be a publishable or anon key, not a privileged key");
}
