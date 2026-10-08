import PropertyList from "@/components/PropertyList";
import { getProperties } from "@/lib/api";

export default async function PropertiesPage() {
  let properties;
  try {
    properties = await getProperties();
  } catch {
    return <main><h1>Properties</h1><p role="alert">Could not load properties. Check that the backend is running and try again.</p></main>;
  }
  return <main><h1>Find your next stay</h1><PropertyList properties={properties} /></main>;
}
