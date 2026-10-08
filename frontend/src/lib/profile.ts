import type { AuthResponse } from "@/types/api";

export function profileName(user: AuthResponse["user"]): string {
  const name = user.user_metadata?.display_name || user.user_metadata?.full_name;
  return typeof name === "string" ? name.trim() : "";
}
