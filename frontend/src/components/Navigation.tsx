"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getCurrentUser, logout } from "@/lib/api";
import type { AuthResponse } from "@/types/api";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then(({ user }) => {
      if (active) {
        setUser(user);
        setError("");
      }
    }).catch(error => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setError("");
      } else {
        setError("Could not check your session. Please reload to try again.");
      }
    });
    return () => { active = false; };
  }, [pathname]);

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await logout();
    } catch (error) {
      // An expired session is already signed out; other failures allow retry.
      if (!(error instanceof ApiError && error.status === 401)) {
        setError(error instanceof Error ? error.message : "Could not sign out.");
        setPending(false);
        return;
      }
    }
    setUser(null);
    setPending(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav aria-label="Main navigation">
      <Link href="/">StayFinder</Link>
      <Link href="/properties">Properties</Link>
      {user ? <>
        <Link href="/my-properties">My Properties</Link>
        <Link href="/bookings">Bookings</Link>
        <Link href="/profile">Profile</Link>
        <span>Signed in as {user.email || "StayFinder user"}</span>
        <button type="button" onClick={signOut} disabled={pending}>
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </> : <>
        <Link href="/login">Sign in</Link>
        <Link href="/register">Register</Link>
      </>}
      {error && <p role="alert">{error}</p>}
    </nav>
  );
}
