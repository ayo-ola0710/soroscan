import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { SkipToContent } from "@/components/ui/SkipToContent"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

const BASE_URL = "https://soroscan.io"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "SoroScan — Soroban Event Indexing",
    template: "%s | SoroScan",
  },
  description:
    "SoroScan is the event indexing platform for Soroban smart contracts on the Stellar blockchain. Query events via GraphQL, REST, or real-time webhooks.",
  keywords: ["soroban", "stellar", "event indexing", "smart contracts", "graphql", "blockchain", "soroscan"],
  authors: [{ name: "SoroScan Team" }],
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "SoroScan — Soroban Event Indexing",
    description:
      "The Graph for Soroban. Index, query, and subscribe to Soroban smart contract events on Stellar.",
    siteName: "SoroScan",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SoroScan — Soroban Event Indexing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoroScan — Soroban Event Indexing",
    description: "The Graph for Soroban. Real-time event indexing for Stellar smart contracts.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SoroScan",
  url: BASE_URL,
  description:
    "Event indexing platform for Soroban smart contracts on the Stellar blockchain.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/docs?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-terminal-black text-terminal-green`}
      >
        <SkipToContent />
        <Providers>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
