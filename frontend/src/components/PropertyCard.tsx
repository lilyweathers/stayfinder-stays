import Link from "next/link";
import type { Property } from "@/types/property";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="card">
      <h2><Link href={`/properties/${encodeURIComponent(property.property_id)}`}>{property.title}</Link></h2>
      <p>{property.location}</p>
      <p>{property.description}</p>
      <p>{property.price_per_night} per night · Up to {property.max_guests} guests</p>
      <Link href={`/properties/${encodeURIComponent(property.property_id)}`}>View property</Link>
    </article>
  );
}
