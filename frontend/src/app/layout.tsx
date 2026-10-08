import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";
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
          <Navigation />
        </header>
        {children}
      </body>
    </html>
  );
}
