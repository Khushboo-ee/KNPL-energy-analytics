import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// One family throughout. Inter's `tnum` feature carries the tabular figures in
// the tables (see the `.num` class), so no second font is needed.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EMS Analytics — Bawal Plant",
  description:
    "Energy consumption against production for the Bawal plant, with period-over-period comparison from plant level down to individual equipment.",
};

export const viewport: Viewport = {
  themeColor: "#0B3550",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
