"use client";

import { useState, type FormEvent } from "react";
import { updateProperty } from "@/lib/api";
import type { Property } from "@/types/property";

export default function PropertyEditForm({ property, onSaved }: {
  property: Property; onSaved: (property: Property) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateProperty(property.property_id, {
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        location: String(data.get("location")).trim(),
        price_per_night: Number(data.get("price_per_night")),
        max_guests: Number(data.get("max_guests")),
      });
      onSaved(updated);
      setEditing(false);
      setNotice("Property saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save property.");
    } finally { setPending(false); }
  }
  return <section>
    <h3>Property information</h3>
    {editing ? <form onSubmit={submit}>
      <label>Title<input name="title" minLength={2} required defaultValue={property.title} /></label>
      <label>Description<textarea name="description" minLength={3} required defaultValue={property.description} /></label>
      <label>Location<input name="location" minLength={2} required defaultValue={property.location} /></label>
      <label>Price per night<input name="price_per_night" type="number" min={100} step="0.01" required defaultValue={property.price_per_night} /></label>
      <label>Maximum guests<input name="max_guests" type="number" min={1} step={1} required defaultValue={property.max_guests} /></label>
      <button disabled={pending}>{pending ? "Saving…" : "Save property"}</button>
      <button type="button" disabled={pending} onClick={() => { setEditing(false); setError(""); }}>Discard changes</button>
    </form> : <button type="button" onClick={() => { setEditing(true); setNotice(""); }}>Edit property</button>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
