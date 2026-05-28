import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "Arbitrum Ecosystem Explorer";
const DESCRIPTION =
  "Filterable, searchable directory of every project listed on portal.arbitrum.io. Browse by category, sub-category, and chain, then export the results as CSV.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1424",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
