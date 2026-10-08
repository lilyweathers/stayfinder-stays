import Link from "next/link";
import PropertyFiltersForm from "@/components/PropertyFiltersForm";
import PropertyList from "@/components/PropertyList";
import { ApiError, getProperties } from "@/lib/api";
import type { Property, PropertyFilters } from "@/types/property";

export default async function PropertiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (name: string) => {
    const input = params[name];
    return (Array.isArray(input) ? input[0] : input) || "";
  };
  const filters: PropertyFilters = {
    location: value("location"), max_price: value("max_price"), guests: value("guests"),
    sort: value("sort"),
  };
  const filtered = [filters.location, filters.max_price, filters.guests].some(value => value?.trim());
  let properties: Property[] = [];
  let error = "";
  try {
    properties = await getProperties(filters);
  } catch (cause) {
    error = cause instanceof ApiError && cause.status === 400
      ? cause.message
      : "Could not load properties. Please try again.";
  }
  return <main>
    <h1>Find your next stay</h1>
    <PropertyFiltersForm key={JSON.stringify(filters)} filters={filters} />
    {error ? <div><p role="alert">{error}</p>
      <p>Use Apply filters to try again, or <Link href="/properties">clear filters</Link>.</p>
    </div> : <>
      <p role="status">{properties.length} {properties.length === 1 ? "property" : "properties"} found</p>
      <PropertyList properties={properties} emptyMessage={filtered
        ? "No properties match your filters. Try a different location, price, or guest count."
        : "No properties available yet."} />
    </>}
  </main>;
}
