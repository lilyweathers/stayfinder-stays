"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProperty } from "@/lib/api";
import type { Property } from "@/types/property";

export default function DeletePropertyButton({ property }: { property: Property }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setPending(true); setError("");
    try {
      const result = await deleteProperty(property.property_id);
      router.replace(`/my-properties?deleted=1&cancelled=${result.cancelled_bookings}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete property.");
      setPending(false);
    }
  }
  return <section className="booking-actions">
    {confirming ? <>
      <p>Delete “{property.title}”? All upcoming pending and confirmed bookings, including check-ins today, will be cancelled. Booking history will be preserved.</p>
      <button type="button" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Confirm deletion"}</button>
      <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }}>Keep property</button>
    </> : <button type="button" onClick={() => setConfirming(true)}>Delete property</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
