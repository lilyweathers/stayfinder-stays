import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayFinder",
  description: "Find your next stay with StayFinder.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Main navigation">
            <Link href="/">StayFinder</Link>
            <Link href="/properties">Properties</Link>
            <Link href="/bookings">Bookings</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
