import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S33 Evacuation Digital Twin",
  description:
    "Adaptive evacuation intelligence for buildings and campuses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}