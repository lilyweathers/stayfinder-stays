"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password"));
    setError("");
    if (password !== String(data.get("confirm_password"))) {
      setError("Passwords must match.");
      return;
    }
    setPending(true);
    try {
      const result = await register(String(data.get("email")).trim(), password);
      if (result.confirmationRequired) {
        setConfirmationRequired(true);
        form.reset();
      } else {
        router.push("/bookings");
        router.refresh();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create your account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Create an account</h1>
      {confirmationRequired ? (
        <p role="status">Check your email for a confirmation link. After confirming your email, sign in to StayFinder.</p>
      ) : (
        <form onSubmit={submit}>
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" minLength={6} required autoComplete="new-password" aria-describedby="password-help" /></label>
          <p id="password-help">Use at least 6 characters.</p>
          <label>Confirm password<input name="confirm_password" type="password" minLength={6} required autoComplete="new-password" /></label>
          <button disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      <p>Already have an account? <Link href="/login">Sign in</Link></p>
    </main>
  );
}
