"use client";

import ProfileAvatar from "@/components/ProfileAvatar";
import ProfilePhotoField from "@/components/ProfilePhotoField";
import { readPhoto } from "@/lib/profile-photo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, deleteAccount, getCurrentUser, updateProfile } from "@/lib/api";
import { profileName, profileBio } from "@/lib/profile";
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then(({ user }) => { if (active) setUser(user); }).catch(error => {
      if (active && !(error instanceof ApiError && error.status === 401)) {
        setError("Could not load your profile. Please reload to try again.");
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) { setError("Enter your name."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const file = formData.get("photo");
      const remove = formData.get("remove_photo") === "on";
      const photo = !remove && file instanceof File && file.size ? await readPhoto(file) : undefined;
      const result = await updateProfile(name, photo, remove, String(formData.get("bio") ?? "").trim());
      setUser(result.user); setEditing(false); setNotice("Profile updated.");
      window.dispatchEvent(new Event("stayfinder:profile-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your profile.");
      if (cause instanceof ApiError && cause.status === 401) setUser(null);
    } finally { setSaving(false); }
  }

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
      <section className="card profile-card" aria-label="Account information">
        <div className="profile-header">
          <ProfileAvatar user={user} />
          <div><p className="home-eyebrow">Your StayFinder account</p><h2>{profileName(user) || "Welcome to StayFinder"}</h2><p>{user.email}</p></div>
        </div>
        {notice && <p role="status">{notice}</p>}
        {editing ? <form onSubmit={saveProfile}>
          <label>Name<input name="name" required maxLength={100} autoComplete="name" defaultValue={profileName(user)} disabled={saving} /></label>
          <label>About you (optional)<textarea name="bio" maxLength={1000} defaultValue={profileBio(user)} disabled={saving} placeholder="Tell others a little about yourself." /></label>
          <ProfilePhotoField currentUrl={user.user_metadata?.avatar_url} disabled={saving} />
          <button disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          <button className="button-danger" type="button" disabled={saving} onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
        </form> : <>
          <dl className="property-information">
            <dt>Name</dt><dd>{profileName(user) || "Add your name to personalize your profile"}</dd>
            <dt>About you</dt><dd>{profileBio(user) || "No description added yet"}</dd>
            <dt>Email</dt><dd>{user.email || "Not available"}</dd>
            <dt>Email confirmation</dt><dd>{user.email_confirmed_at ? "Confirmed" : "Not confirmed"}</dd>
          </dl>
          <button type="button" onClick={() => { setEditing(true); setNotice(""); setError(""); }}>Edit profile</button>
        </>}
        <p><Link href="/bookings">Your bookings</Link> · <Link href="/my-properties">Your properties</Link></p>
        <details className="profile-account-details"><summary>Account details</summary>
          <dl className="property-information">
            <dt>Account ID</dt><dd>{user.id}</dd>
            <dt>Account created</dt><dd>{displayDate(user.created_at)}</dd>
            <dt>Last sign-in</dt><dd>{displayDate(user.last_sign_in_at)}</dd>
          </dl>
        </details>
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
