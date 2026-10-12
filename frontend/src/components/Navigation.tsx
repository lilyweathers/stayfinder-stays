"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getCurrentUser, logout } from "@/lib/api";
import { profileName } from "@/lib/profile";
import type { AuthResponse } from "@/types/api";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState({ pathname, open: false });
  const menuOpen = menu.pathname === pathname && menu.open;

  useEffect(() => {
    let active = true;
    function loadUser() { getCurrentUser().then(({ user }) => {
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
    }
    loadUser();
    window.addEventListener("stayfinder:profile-updated", loadUser);
    return () => { active = false; window.removeEventListener("stayfinder:profile-updated", loadUser); };
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
    <nav className="site-navigation" aria-label="Main navigation" onKeyDown={event => {
      if (event.key === "Escape") {
        setMenu({ pathname, open: false });
        event.currentTarget.querySelector<HTMLButtonElement>(".navigation-toggle")?.focus();
      }
    }}>
      <Link className="navigation-brand" href="/" onClick={() => setMenu({ pathname, open: false })}>StayFinder</Link>
      <button className="navigation-toggle" type="button" aria-expanded={menuOpen} aria-controls="navigation-links"
        onClick={() => setMenu({ pathname, open: !menuOpen })}>
        {menuOpen ? "Close menu" : "Menu"}
      </button>
      <div id="navigation-links" className={`navigation-links${menuOpen ? " is-open" : ""}`}
        onClick={event => {
          if ((event.target as HTMLElement).closest("a")) setMenu({ pathname, open: false });
        }}>
      <Link href="/properties">Properties</Link>
      {user ? <>
        <Link href="/my-properties">My Properties</Link>
        <Link href="/bookings">Bookings</Link>
        <Link href="/profile" title="View your profile">{profileName(user) || user.email || "Your profile"}</Link>
        <button type="button" onClick={signOut} disabled={pending}>
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </> : <>
        <Link href="/login">Sign in</Link>
        <Link href="/register">Register</Link>
      </>}
      </div>
      {error && <p role="alert">{error}</p>}
    </nav>
  );
}
