export interface Property {
  owner_id: string | null;
  property_id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
}

export type PropertyInput = Omit<Property, "property_id" | "owner_id">;

export interface PropertyFilters {
  sort?: string;
  location?: string;
  max_price?: string;
  guests?: string;
}
