import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://hazards.nshipyard.com";
const OG_TITLE = "hazardlens: 26 landslide events extracted from global news";
const OG_DESCRIPTION =
  "A structured, queryable open dataset of 26 reported landslide events across 8 countries (Jul 24 to Oct 2, 2026), extracted from GDELT 2.0 news. Map, feed, and REST API, with the source article on every record.";

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "hazardlens",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-card.png`,
        width: 1200,
        height: 630,
        alt: OG_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [`${SITE_URL}/og-card.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
