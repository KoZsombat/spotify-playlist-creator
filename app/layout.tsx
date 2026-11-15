import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crate — describe it, press play",
  description:
    "Sign in with Spotify, describe the music you want, and get a 50-track playlist built around your picks.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
