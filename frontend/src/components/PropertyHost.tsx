import Link from "next/link";
import ProfileAvatar from "@/components/ProfileAvatar";
import { getPropertyHost } from "@/lib/api";

export default async function PropertyHost({ propertyId, ownerId }: { propertyId: string; ownerId: string | null }) {
  let host;
  try { host = await getPropertyHost(propertyId); }
  catch { return <p className="property-host-unavailable">Host information is unavailable right now.</p>; }
  return <section className="property-host" aria-label="Property host">
    <ProfileAvatar user={{ id: "", user_metadata: { display_name: host.name, avatar_url: host.avatar_url } }} />
    <div><p>Hosted by</p><h2>{ownerId ? <Link href={`/profiles/${encodeURIComponent(ownerId)}`}>{host.name}</Link> : host.name}</h2></div>
  </section>;
}
