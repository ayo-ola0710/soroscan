/**
 * SubscriptionStatusBadge
 * ────────────────────────────────────────────────────────────────────
 * Displays the current GraphQL WebSocket connection state.
 *
 * States:
 *   connected    – solid green pulse
 *   reconnecting – amber pulse animation
 *   disconnected – red, static
 *   unavailable  – gray, static (WS not configured)
 */
"use client";

import type { ConnectionState } from "@/src/hooks/useContractEventSubscription";

interface SubscriptionStatusBadgeProps {
  connectionState: ConnectionState;
  className?: string;
}

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; dotClass: string; textClass: string; animate: boolean }
> = {
  connected: {
    label: "Connected",
    dotClass: "bg-terminal-green",
    textClass: "text-terminal-green",
    animate: true,
  },
  reconnecting: {
    label: "Reconnecting",
    dotClass: "bg-terminal-warning",
    textClass: "text-terminal-warning",
    animate: true,
  },
  disconnected: {
    label: "Disconnected",
    dotClass: "bg-terminal-danger",
    textClass: "text-terminal-danger",
    animate: false,
  },
  unavailable: {
    label: "Unavailable",
    dotClass: "bg-terminal-gray",
    textClass: "text-terminal-gray",
    animate: false,
  },
};

export function SubscriptionStatusBadge({
  connectionState,
  className = "",
}: SubscriptionStatusBadgeProps) {
  const { label, dotClass, textClass, animate } =
    STATE_CONFIG[connectionState] ?? STATE_CONFIG.unavailable;

  return (
    <span
      role="status"
      aria-label={`WebSocket connection: ${label}`}
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "border border-current/30 font-terminal-mono text-xs tracking-wider uppercase",
        textClass,
        className,
      ].join(" ")}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        className={[
          "inline-block w-2 h-2 rounded-full",
          dotClass,
          animate ? "animate-pulse" : "",
        ].join(" ")}
      />
      {label}
    </span>
  );
}
