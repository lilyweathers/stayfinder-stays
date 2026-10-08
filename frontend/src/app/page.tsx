import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>StayFinder</h1>
      <p>Your next stay starts here.</p>
      <Link href="/properties">Browse properties</Link>
    </main>
  );
}
