export interface Property {
  owner_id: string | null;
  property_id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  image_url?: string | null;
}

export type PropertyInput = Omit<Property, "property_id" | "owner_id">;

export interface PropertyFilters {
  check_in?: string;
  check_out?: string;
  sort?: string;
  location?: string;
  max_price?: string;
  guests?: string;
}

export interface PropertyHost { name: string; avatar_url: string | null }
