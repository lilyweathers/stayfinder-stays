import PropertyCard from "@/components/PropertyCard";
import type { Property } from "@/types/property";

export default function PropertyList({ properties, emptyMessage = "No properties available yet." }: { properties: Property[]; emptyMessage?: string }) {
  if (properties.length === 0) return <p>{emptyMessage}</p>;
  return <div className="property-list">{properties.map(property => (
    <PropertyCard key={property.property_id} property={property} />
  ))}</div>;
}
