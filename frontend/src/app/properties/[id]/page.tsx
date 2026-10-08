import { Suspense } from "react";
import PropertyHost from "@/components/PropertyHost";
import PropertyImage from "@/components/PropertyImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import { ApiError, getProperty } from "@/lib/api";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let property;
  try {
    property = await getProperty(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <main><h1>Property</h1><p role="alert">Could not load this property. Please try again.</p><p><a href={`/properties/${encodeURIComponent(id)}`}>Try again</a></p><Link href="/properties">Browse properties</Link></main>;
  }
  return (
    <main>
      <h1>{property.title}</h1>
      <p>{property.location}</p>
      <PropertyImage src={property.image_url} title={property.title} detail />
      <p>{property.description}</p>
      <p>{property.price_per_night} per night · Up to {property.max_guests} guests</p>
      <Suspense fallback={<p role="status">Loading host information…</p>}><PropertyHost propertyId={property.property_id} /></Suspense>
      <BookingForm property={property} />
    </main>
  );
}
