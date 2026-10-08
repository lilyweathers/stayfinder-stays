import type { AuthResponse } from "@/types/api";

export function profileName(user: AuthResponse["user"]): string {
  const name = user.user_metadata?.display_name || user.user_metadata?.full_name;
  return typeof name === "string" ? name.trim() : "";
}

export function profileBio(user: AuthResponse["user"]): string {
  const bio = user.user_metadata?.bio;
  return typeof bio === "string" ? bio : "";
}
