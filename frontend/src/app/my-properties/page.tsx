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
    <div className="my-properties-heading">
      <div><h1>My Properties</h1><p>Manage your properties and their bookings.</p></div>
      {!loading && !error && !creating && properties.length > 0 && <button type="button" onClick={() => { setCreating(true); setNotice(""); }}>Add property</button>}
    </div>
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading your properties…</p>}
    {error && <p role="alert">{error}</p>}
    {needsLogin && <Link href="/login">Sign in</Link>}
    {error && !needsLogin && <button type="button" onClick={() => {
      setLoading(true); setError(""); setProperties([]); setAttempt(value => value + 1);
    }}>Try again</button>}
    {!loading && !error && creating && <CreatePropertyForm onClose={() => setCreating(false)} onCreated={property => {
      setProperties(current => [property, ...current]);
      setCreating(false);
      setNotice(`Property "${property.title}" created successfully.`);
    }} />}
    {!loading && !error && !creating && properties.length === 0 && <section className="hosting-empty" aria-labelledby="hosting-heading">
      <svg className="hosting-illustration" viewBox="0 0 200 160" fill="none" aria-hidden="true">
        <circle cx="100" cy="80" r="72" fill="#e6eee8" />
        <path d="M30 136h140" stroke="#9ab5a8" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 77v59h84V77" fill="#fffdf7" stroke="#35605b" strokeWidth="3" strokeLinejoin="round" />
        <path d="m45 82 55-45 55 45" stroke="#35605b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M89 136v-34h22v34" fill="#d7a36c" stroke="#35605b" strokeWidth="3" />
        <rect x="69" y="85" width="16" height="17" rx="2" fill="#d6e9ed" stroke="#35605b" strokeWidth="2" />
        <rect x="116" y="85" width="16" height="17" rx="2" fill="#d6e9ed" stroke="#35605b" strokeWidth="2" />
        <path d="M36 134v-23m0 10-9-9m9 5 9-10M164 134v-23m0 10-9-9m9 5 9-10" stroke="#6c9277" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="home-eyebrow">Make room for new adventures</p>
      <h2 id="hosting-heading">Your hosting journey starts here</h2>
      <p>Have a place you’d like to share? Add your first property, then manage its details and guest bookings here.</p>
      <button type="button" onClick={() => { setCreating(true); setNotice(""); }}>Add your first property <span aria-hidden="true">→</span></button>
    </section>}
    {!loading && !error && properties.map(property => <article className="card account-property-card" key={property.property_id}>
      <Link href={`/my-properties/${encodeURIComponent(property.property_id)}`}><PropertyImage src={property.image_url} title={property.title} /></Link>
      <h2>{property.title}</h2>
      <p>{property.location}</p>
      <p>{property.price_per_night} per night · Up to {property.max_guests} guests</p>
      <Link href={`/my-properties/${encodeURIComponent(property.property_id)}`}>Manage property</Link>
    </article>)}
  </main>;
}
