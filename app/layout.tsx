import type { Metadata } from "next";
import { tokensAsCss } from "../lib/tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tartan Tickets",
  description: "Tickets for student club events",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{tokensAsCss()}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
