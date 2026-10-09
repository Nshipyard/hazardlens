import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hazardlens: news-derived landslide event data",
  description:
    "hazardlens turns global news into a structured, queryable open dataset of landslide events, extracted from GDELT 2.0 GKG. Map, feed, and REST API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
