import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEO Diagnostic — AI Search Visibility Tool",
  description: "See how GPT, Claude, and Gemini rank your product when shoppers ask AI assistants for recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
