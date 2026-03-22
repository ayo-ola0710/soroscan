"use client"

import * as React from "react"
import { LiveEventStream } from "../LiveEventStream"

export function EventStream() {

  return (
    <section className="space-y-8">
      {/* Problem / Solution narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-terminal-green/20 p-6 md:p-8 relative">
        <div className="scanline-overlay" />
        <div>
          <div className="text-[10px] text-terminal-danger tracking-widest mb-2 font-terminal-mono">[PROBLEM]</div>
          <h3 className="text-xl font-bold text-terminal-danger mb-3 font-terminal-mono">NO_THE_GRAPH_FOR_SOROBAN</h3>
          <p className="text-terminal-gray text-sm leading-relaxed">
            Developers building on Stellar&apos;s Soroban smart contracts have no reliable way to
            index or query on-chain events. Building custom indexers means managing infrastructure,
            dealing with ledger polling, and writing brittle parsers — just to answer &quot;what events did my contract emit?&quot;
          </p>
        </div>
        <div>
          <div className="text-[10px] text-terminal-green tracking-widest mb-2 font-terminal-mono">[SOLUTION]</div>
          <h3 className="text-xl font-bold text-terminal-green mb-3 font-terminal-mono">SOROSCAN_IS_THE_FIX</h3>
          <p className="text-terminal-gray text-sm leading-relaxed">
            SoroScan provides a managed event indexing service — connect your contract, define your
            event schema, and immediately query events via GraphQL or REST. Webhook subscriptions
            push events to your backend in real-time. No infrastructure. No polling. No complexity.
          </p>
        </div>
      </div>

      <LiveEventStream contractId="CB76XYM3HDYCR2LZEM6BTXGWBZCH6D66Z6F7B" />
    </section>
  )
}
