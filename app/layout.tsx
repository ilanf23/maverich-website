import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { LenisProvider } from "@/components/providers/lenis-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Maverich — Vibe-coded operating systems",
  description:
    "We build the software that runs the businesses that don't have time to build software.",
  metadataBase: new URL("https://maverich.ai"),
  openGraph: {
    title: "Maverich — Vibe-coded operating systems",
    description:
      "We build the software that runs the businesses that don't have time to build software.",
    url: "https://maverich.ai",
    siteName: "Maverich",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maverich — Vibe-coded operating systems",
    description:
      "We build the software that runs the businesses that don't have time to build software.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
