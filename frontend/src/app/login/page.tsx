"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await login(String(data.get("email")), String(data.get("password")));
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      let destination = "/bookings";
      if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
        const target = new URL(returnTo, window.location.origin);
        if (target.origin === window.location.origin && target.pathname.startsWith("/properties/")) {
          destination = target.pathname + target.search;
        }
      }
      router.push(destination);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main>
      <h1>Sign in</h1>
      <p>Use your existing StayFinder account.</p>
      <form onSubmit={submit}>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
        <button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>New to StayFinder? <Link href="/register">Create an account</Link></p>
    </main>
  );
}
