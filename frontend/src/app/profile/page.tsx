"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, deleteAccount, getCurrentUser } from "@/lib/api";
import type { AuthResponse } from "@/types/api";

function displayDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser().then(({ user }) => { if (active) setUser(user); }).catch(error => {
      if (active && !(error instanceof ApiError && error.status === 401)) {
        setError("Could not load your profile. Please reload to try again.");
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await deleteAccount(password);
      setPassword("");
      window.alert("Your account has been deleted.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setPassword("");
      setError(error instanceof Error ? error.message : "Could not delete your account.");
      if (error instanceof ApiError && error.status === 401) setUser(null);
      setPending(false);
    }
  }

  return <main>
    <h1>Your profile</h1>
    {loading ? <p>Loading your account…</p> : user ? <>
      <section aria-label="Account information">
        <dl>
          <dt>Email</dt><dd>{user.email || "Not available"}</dd>
          <dt>Account ID</dt><dd>{user.id}</dd>
          <dt>Email confirmation</dt><dd>{user.email_confirmed_at ? "Confirmed" : "Not confirmed"}</dd>
          <dt>Account created</dt><dd>{displayDate(user.created_at)}</dd>
          <dt>Last sign-in</dt><dd>{displayDate(user.last_sign_in_at)}</dd>
        </dl>
        <p><Link href="/bookings">Your bookings</Link> · <Link href="/my-properties">Your properties</Link></p>
      </section>
      <section aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading">Delete account</h2>
        <p>This permanently deletes your account and its owned properties from the database. Their upcoming pending or confirmed bookings will be cancelled. Booking history will be retained.</p>
        {confirming ? <form onSubmit={confirmDeletion}>
          <label htmlFor="deletion-password">Confirm with your current password</label>
          <input id="deletion-password" name="password" type="password" autoComplete="current-password"
            required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} disabled={pending} />
          <button className="button-danger" type="submit" disabled={pending || !password}>{pending ? "Deleting account…" : "Confirm delete account"}</button>
          <button className="button-danger" type="button" disabled={pending} onClick={() => { setConfirming(false); setPassword(""); setError(""); }}>Cancel</button>
        </form> : <button className="button-danger" type="button" onClick={() => setConfirming(true)}>Delete account</button>}
      </section>
    </> : <p>Please <Link href="/login">sign in</Link> to view your profile.</p>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
