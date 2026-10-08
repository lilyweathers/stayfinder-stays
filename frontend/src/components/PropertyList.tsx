import PropertyCard from "@/components/PropertyCard";
import type { Property } from "@/types/property";

export default function PropertyList({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return <p>No properties available yet.</p>;
  return <div className="property-list">{properties.map(property => (
    <PropertyCard key={property.property_id} property={property} />
  ))}</div>;
}
