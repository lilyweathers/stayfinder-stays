"use client";

import Link from "next/link";
import PropertyImage from "@/components/PropertyImage";
import { useEffect, useState } from "react";
import { ApiError, getCurrentUser, getProperties } from "@/lib/api";
import type { Property } from "@/types/property";
import CreatePropertyForm from "@/components/CreatePropertyForm";

export default function MyPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const search = new URLSearchParams(window.location.search);
        if (search.get("deleted") === "1" && active) {
          const count = Number(search.get("cancelled"));
          setNotice(`Property deleted. ${Number.isSafeInteger(count) && count >= 0 ? count : 0} upcoming bookings cancelled.`);
        }
        const { user } = await getCurrentUser();
        const rows = await getProperties();
        if (active) setProperties(rows.filter(property => property.owner_id === user.id));
      } catch (error) {
        if (!active) return;
        const unauthorized = error instanceof ApiError && error.status === 401;
        setNeedsLogin(unauthorized);
        setError(unauthorized ? "Sign in to view your properties." : "Could not load your properties.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);
  return <main>
    <h1>My Properties</h1>
    <p>Manage your properties and their bookings.</p>
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading your properties…</p>}
    {error && <p role="alert">{error}</p>}
    {needsLogin && <Link href="/login">Sign in</Link>}
    {error && !needsLogin && <button type="button" onClick={() => {
      setLoading(true); setError(""); setProperties([]); setAttempt(value => value + 1);
    }}>Try again</button>}
    {!loading && !error && (creating ? <CreatePropertyForm onClose={() => setCreating(false)} onCreated={property => {
      setProperties(current => [property, ...current]);
      setCreating(false);
      setNotice(`Property "${property.title}" created successfully.`);
    }} /> : <p><button type="button" onClick={() => { setCreating(true); setNotice(""); }}>Create new property</button></p>)}
    {!loading && !error && properties.length === 0 && <p>You do not own any properties yet.</p>}
    {!loading && !error && properties.map(property => <article className="card account-property-card" key={property.property_id}>
      <Link href={`/my-properties/${encodeURIComponent(property.property_id)}`}><PropertyImage src={property.image_url} title={property.title} /></Link>
      <h2>{property.title}</h2>
      <p>{property.location}</p>
      <p>{property.price_per_night} per night · Up to {property.max_guests} guests</p>
      <Link href={`/my-properties/${encodeURIComponent(property.property_id)}`}>Manage property</Link>
    </article>)}
  </main>;
}
