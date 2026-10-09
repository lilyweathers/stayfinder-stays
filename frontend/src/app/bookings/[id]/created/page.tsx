import BookingCreatedSummary from "@/components/BookingCreatedSummary";

export const metadata = { title: "Booking created | StayFinder" };

export default async function BookingCreatedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingCreatedSummary key={id} bookingId={id} />;
}
