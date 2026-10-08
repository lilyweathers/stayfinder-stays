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
    return <main><h1>Property</h1><p role="alert">Could not load this property. Please try again later.</p></main>;
  }
  return (
    <main>
      <h1>{property.title}</h1>
      <p>{property.location}</p>
      <p>{property.description}</p>
      <p>{property.price_per_night} per night · Up to {property.max_guests} guests</p>
      <BookingForm property={property} />
    </main>
  );
}
