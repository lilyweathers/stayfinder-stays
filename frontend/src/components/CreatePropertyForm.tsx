"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError, createProperty } from "@/lib/api";
import type { Property } from "@/types/property";

export default function CreatePropertyForm({ onCreated, onClose }: {
  onCreated: (property: Property) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError(""); setNeedsLogin(false);
    try {
      const property = await createProperty({
        image_url: String(data.get("image_url") ?? "").trim() || null,
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        location: String(data.get("location")).trim(),
        price_per_night: Number(data.get("price_per_night")),
        max_guests: Number(data.get("max_guests")),
      });
      onCreated(property);
    } catch (error) {
      setNeedsLogin(error instanceof ApiError && error.status === 401);
      setError(error instanceof Error ? error.message : "Could not create property. Please try again.");
    } finally { setPending(false); }
  }
  return <section className="card" aria-labelledby="create-property-heading">
    <h2 id="create-property-heading">Create a property</h2>
    <form onSubmit={submit}>
      <label>Title<input name="title" minLength={2} required /></label>
      <label>Description<textarea name="description" minLength={3} required /></label>
      <label>Image URL (optional)<input name="image_url" type="url" pattern="https://.*" placeholder="https://…" /></label>
      <label>Location<input name="location" minLength={2} required /></label>
      <label>Price per night<input name="price_per_night" type="number" min={100} step="0.01" required /></label>
      <label>Maximum guests<input name="max_guests" type="number" min={1} step={1} required /></label>
      <button disabled={pending}>{pending ? "Creating…" : "Create property"}</button>
      <button className="button-danger" type="button" disabled={pending} onClick={onClose}>Cancel</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {needsLogin && <Link href="/login">Sign in again</Link>}
  </section>;
}
