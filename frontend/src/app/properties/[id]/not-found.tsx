import Link from "next/link";

export default function PropertyNotFound() {
  return <main>
    <h1>Property not found</h1>
    <p>This property does not exist or is no longer available.</p>
    <Link href="/properties">Browse properties</Link>
  </main>;
}
