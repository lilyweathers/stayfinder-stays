interface Property {
  owner_id: string | null;
  property_id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  image_url?: string | null;
}

type NewProperty = Omit<Property, "property_id" | "owner_id">;
