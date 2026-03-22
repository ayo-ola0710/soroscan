/**
 * LiveEventTicker
 * ────────────────────────────────────────────────────────────────────
 * Scrolling live feed of real-time contract events delivered via
 * GraphQL WebSocket subscription.
 *
 * Features:
 *  - Newest events prepended at the top (max 50 kept in memory)
 *  - aria-live="polite" region for screen-reader announcements
 *  - Graceful degradation: shows a polling notice when WS is unavailable
 *  - SubscriptionStatusBadge shows connection health
 */
"use client";

import { useContractEventSubscription } from "@/src/hooks/useContractEventSubscription";
import { SubscriptionStatusBadge } from "@/components/ui/SubscriptionStatusBadge";

interface LiveEventTickerProps {
  contractId: string;
  maxEvents?: number;
  className?: string;
}

export function LiveEventTicker({
  contractId,
  maxEvents = 50,
  className = "",
}: LiveEventTickerProps) {
  const { events, loading, connectionState } = useContractEventSubscription({
    contractId,
    maxEvents,
  });

  const isUnavailable = connectionState === "unavailable";

  return (
    <section
      className={[
        "flex flex-col gap-3 rounded border border-terminal-green/30",
        "bg-terminal-black/80 backdrop-blur-sm p-4",
        className,
      ].join(" ")}
      aria-label="Live contract event feed"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-terminal-mono text-xs uppercase tracking-widest text-terminal-cyan m-0">
          Live Events
        </h2>
        <SubscriptionStatusBadge connectionState={connectionState} />
      </div>

      {/* Graceful degradation notice */}
      {isUnavailable && (
        <p
          role="status"
          className="text-terminal-gray font-terminal-mono text-xs"
        >
          Real-time feed unavailable.{" "}
          <span className="text-terminal-cyan">Falling back to polling.</span>
        </p>
      )}

      {/* Initial loading spinner */}
      {loading && events.length === 0 && (
        <p className="text-terminal-gray font-terminal-mono text-xs animate-pulse">
          Connecting…
        </p>
      )}

      {/* Live event list */}
      {!isUnavailable && (
        <ol
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
          aria-label="Recent contract events"
          className="flex flex-col gap-1.5 max-h-80 overflow-y-auto list-none m-0 p-0"
        >
          {events.length === 0 && !loading ? (
            <li className="text-terminal-gray font-terminal-mono text-xs">
              Waiting for events…
            </li>
          ) : (
            events.map((event) => (
              <li
                key={event.id}
                className={[
                  "grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5",
                  "border-l-2 border-terminal-green/50 pl-2",
                  "font-terminal-mono text-xs",
                ].join(" ")}
              >
                <span className="text-terminal-gray tabular-nums">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-terminal-cyan font-bold uppercase tracking-wider">
                  {event.eventType.toUpperCase()}
                </span>
                <span className="text-terminal-gray col-start-1">
                  L{event.ledgerSequence}
                </span>
                <span className="text-terminal-green/80 truncate" title={event.payload}>
                  {event.payload.length > 80
                    ? `${event.payload.slice(0, 80)}…`
                    : event.payload}
                </span>
              </li>
            ))
          )}
        </ol>
      )}
    </section>
  );
}
