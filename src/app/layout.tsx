import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audit Flash - H-TIC Digital",
  description: "Diagnostic SEO rapide pour vos prospects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
