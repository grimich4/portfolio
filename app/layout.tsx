import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import Header from "@/components/Header";
import { projects } from "@/lib/projects";
import "./globals.css";

const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    {
      path: "../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gasparddavid.fr"),
  title: { default: "Gaspard David — Photographie", template: "%s — Gaspard David" },
  description: "Projets photographiques de Gaspard David.",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Gaspard David" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${display.variable}`}>
      <body className="min-h-svh">
        <Header projects={projects.map((p) => ({ slug: p.slug, title: p.title }))} />
        {children}
      </body>
    </html>
  );
}
