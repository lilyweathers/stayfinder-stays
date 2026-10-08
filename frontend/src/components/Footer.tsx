import Link from "next/link";

export default function Footer() {
  return <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="footer-logo"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m3 13 11-9 11 9M6 11v13h16V11M11 24v-8h6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>StayFinder</Link>
          <p>Somewhere new.<br />Somewhere that feels like home.</p>
          <span className="footer-tagline">City stays · Forest escapes · Lakeside moments</span>
        </div>
        <div className="footer-links"><h2>Find your stay</h2><Link href="/properties">Browse properties</Link><Link href="/bookings">Your bookings</Link></div>
        <div className="footer-links"><h2>Your space</h2><Link href="/my-properties">My Properties</Link><Link href="/profile">Your profile</Link></div>
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} StayFinder</p><p>A little closer to your next adventure.</p></div>
    </div>
  </footer>;
}
