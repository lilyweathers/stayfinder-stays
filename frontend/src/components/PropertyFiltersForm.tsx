"use client";

import Link from "next/link";
import { useRef } from "react";
import type { PropertyFilters } from "@/types/property";

export default function PropertyFiltersForm({ filters }: { filters: PropertyFilters }) {
  const formRef = useRef<HTMLFormElement>(null);
  function clearFields() {
    const form = formRef.current;
    if (!form) return;
    // Reset to empty values, rather than the previously applied defaults.
    for (const field of Array.from(form.elements)) {
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = "";
    }
  }
  return (
    <form ref={formRef} action="/properties" method="get" className="property-filters" aria-label="Filter properties">
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
      <Link href="/properties" onClick={clearFields}>Clear filters</Link>
    </form>
  );
}
