"use client";

import Image from "next/image";
import { useState } from "react";
import { profileName } from "@/lib/profile";
import type { AuthResponse } from "@/types/api";

export default function ProfileAvatar({ user }: { user: AuthResponse["user"] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = user.user_metadata?.avatar_url;
  const name = profileName(user);
  const initials = name ? name.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase() : "SF";
  return <div className="profile-avatar">
    {typeof src === "string" && src.startsWith("https://") && src !== failedUrl
      ? <Image src={src} alt={name ? `Profile photo of ${name}` : "Your profile photo"} width={76} height={76} unoptimized onError={() => setFailedUrl(src)} />
      : <span aria-hidden="true">{initials}</span>}
  </div>;
}
