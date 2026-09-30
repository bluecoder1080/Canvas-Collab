import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canvas — realtime collaborative whiteboard",
  description:
    "Draw, sketch and brainstorm together. Share a link and collaborate live.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
