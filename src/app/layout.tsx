import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trakt MCP Server",
  description:
    "Model Context Protocol server for Trakt.TV — connect your AI agent to your watch history, ratings, watchlist, and more.",
  openGraph: {
    title: "Trakt MCP Server",
    description: "Connect AI agents to Trakt.TV via MCP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
