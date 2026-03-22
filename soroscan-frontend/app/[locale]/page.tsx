"use client"

import * as React from "react"
import "./styles/landing.css"
import { Navbar } from "@/components/terminal/landing/Navbar"
import { Hero } from "@/components/terminal/landing/Hero"
import { Features } from "@/components/terminal/landing/Features"
import { EventStream } from "@/components/terminal/landing/EventStream"
import { Footer } from "@/components/terminal/landing/Footer"
import { CodeSnippet } from "@/components/terminal/landing/CodeSnippet"

const PY_EXAMPLE = `from soroscan import SoroScanClient

# Initialise with your API key
client = SoroScanClient(api_key="sk_live_...")

# Query recent events for a contract
events = await client.events.list(
    contract_id="CABC...9X4Z",
    event_type="SWAP_COMPLETE",
    limit=50,
)

for event in events:
    print(event.ledger, event.data)

# Subscribe to live events via webhook
await client.webhooks.create(
    contract_id="CABC...9X4Z",
    url="https://yourapp.io/webhook",
    secret="whsec_...",
)`

const TS_EXAMPLE = `import { SoroScanClient } from "@soroscan/sdk"

// Initialise with your API key
const client = new SoroScanClient({ apiKey: "sk_live_..." })

// Query recent events
const { events } = await client.events.list({
  contractId: "CABC...9X4Z",
  eventType: "LIQUIDITY_ADD",
  limit: 50,
})

events.forEach((event) => {
  console.log(event.ledger, event.data)
})

// GraphQL query
const result = await client.graphql(\`
  query {
    events(contractId: "CABC...9X4Z", limit: 10) {
      ledger timestamp eventType data
    }
  }
\`)`

export default function Home() {
  return (
    <div className="min-h-screen font-terminal-mono selection:bg-terminal-green selection:text-terminal-black">
      <Navbar />

      <main className="container mx-auto px-6 md:px-8 py-12 md:py-16 space-y-20 md:space-y-28">
        <Hero />
        <Features />

        {/* SDK Code examples */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-terminal-green whitespace-nowrap font-terminal-mono">
              [SDK_EXAMPLES]
            </h2>
            <div className="h-[2px] w-full bg-terminal-green/20" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] text-terminal-gray tracking-widest mb-3">Python SDK</div>
              <CodeSnippet code={PY_EXAMPLE} language="python" filename="example.py" />
            </div>
            <div>
              <div className="text-[10px] text-terminal-gray tracking-widest mb-3">TypeScript SDK</div>
              <CodeSnippet code={TS_EXAMPLE} language="typescript" filename="example.ts" />
            </div>
          </div>
        </section>

        <EventStream />
        <Footer />
      </main>

      {/* Global background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-20">
        <div className="absolute top-0 left-0 w-full h-1 bg-terminal-green shadow-glow-green animate-[scan_8s_linear_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>
    </div>
  )
}
