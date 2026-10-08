import Link from "next/link";
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
    <form action="/properties" method="get" className="property-filters" aria-label="Filter properties">
      <label>Location<input name="location" type="search" maxLength={100}
        placeholder="City or country" defaultValue={filters.location} /></label>
      <label>Maximum price per night<input name="max_price" type="number" min={0}
        step="any" placeholder="Any price" defaultValue={filters.max_price} /></label>
      <label>Guests<input name="guests" type="number" min={1} step={1}
        placeholder="Any guest count" defaultValue={filters.guests} /></label>
      <label>Sort by price<select name="sort" defaultValue={filters.sort}>
        <option value="">Default order</option>
        <option value="asc">Lowest price first</option>
        <option value="desc">Highest price first</option>
      </select></label>
      <button type="submit">Apply filters</button>
      <Link href="/properties">Clear filters</Link>
    </form>
    {error ? <p role="alert">{error}</p> : <>
      <p role="status">{properties.length} {properties.length === 1 ? "property" : "properties"} found</p>
      <PropertyList properties={properties} emptyMessage={filtered
        ? "No properties match your filters. Try a different location, price, or guest count."
        : "No properties available yet."} />
    </>}
  </main>;
}
