import { Suspense } from "react";
import PropertyCard from "@/components/PropertyCard";
import { notFound } from "next/navigation";
import ProfileAvatar from "@/components/ProfileAvatar";
import { ApiError, getPublicProfile, getProperties } from "@/lib/api";

async function ProfileProperties({ userId, name }: { userId: string; name: string }) {
  let properties;
  try { properties = (await getProperties()).filter(property => property.owner_id === userId); }
  catch { return <p role="status">Could not load this member’s properties. Please reload to try again.</p>; }
  if (!properties.length) return null;
  return <section className="public-profile-properties" aria-labelledby="profile-properties-heading">
    <h2 id="profile-properties-heading">Stays hosted by {name}</h2>
    <div className="property-list">{properties.map(property => <PropertyCard key={property.property_id} property={property} />)}</div>
  </section>;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let profile;
  try { profile = await getPublicProfile(id); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <main><h1>Profile</h1><p role="alert">Could not load this profile. Please try again.</p><a href={`/profiles/${encodeURIComponent(id)}`}>Try again</a></main>;
  }
  return <main>
    <section className="card public-profile" aria-label="Public profile">
      <ProfileAvatar user={{ id, user_metadata: { display_name: profile.name, avatar_url: profile.avatar_url } }} />
      <h1>{profile.name}</h1>
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
    </section>
    <Suspense fallback={<p role="status">Loading properties…</p>}><ProfileProperties userId={id} name={profile.name} /></Suspense>
  </main>;
}
