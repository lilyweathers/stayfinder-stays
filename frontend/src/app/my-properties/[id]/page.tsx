import Link from "next/link";
import PropertyOwnerPanel from "@/components/PropertyOwnerPanel";

export default async function ManagePropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main>
    <Link href="/my-properties">Back to My Properties</Link>
    <PropertyOwnerPanel key={id} propertyId={id} />
  </main>;
}
