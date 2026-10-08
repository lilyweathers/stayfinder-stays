import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import PropertyCard from "@/components/PropertyCard";
import { getProperties } from "@/lib/api";

async function FeaturedStays() {
  let properties;
  try {
    properties = await getProperties();
  } catch {
    return <p>Featured stays are unavailable right now. <Link href="/properties">Browse properties</Link> to try again.</p>;
  }
  if (!properties.length) return <p>New stays are on their way. Check back soon.</p>;
  const featured = [...properties].sort((a, b) => a.title.localeCompare(b.title)).slice(0, 3);
  return <div className="property-list">{featured.map(property => <PropertyCard key={property.property_id} property={property} />)}</div>;
}

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-heading">
        <Image src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=85"
          alt="" fill unoptimized loading="eager" sizes="(max-width: 1120px) 100vw, 1072px" />
        <div className="home-hero-content">
          <p className="home-eyebrow">A change of scenery</p>
          <h1 id="home-heading">Find your next stay in Sweden.</h1>
          <p>From city studios to peaceful cabins. Find a place to slow down, explore, and feel at home.</p>
          <Link className="home-button" href="/properties">Browse stays <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section className="home-featured" aria-labelledby="featured-heading">
        <div className="home-section-heading">
          <div><p className="home-eyebrow">Somewhere new</p><h2 id="featured-heading">Featured stays</h2><p>A few places to inspire your next getaway.</p></div>
          <Link href="/properties">View all stays <span aria-hidden="true">→</span></Link>
        </div>
        <Suspense fallback={<p role="status">Loading featured stays…</p>}><FeaturedStays /></Suspense>
      </section>
    </main>
  );
}
