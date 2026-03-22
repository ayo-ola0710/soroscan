/**
 * Tests for GraphQL WebSocket subscription components.
 * ────────────────────────────────────────────────────────────────────
 * All Apollo and WebSocket dependencies are mocked so tests run in
 * jsdom without a live server.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// ── Mock useContractEventSubscription ───────────────────────────────
const mockUseSubscription = jest.fn();

jest.mock("@/src/hooks/useContractEventSubscription", () => ({
  useContractEventSubscription: mockUseSubscription,
}));

// ── SubscriptionStatusBadge ───────────────────────────────────────
describe("SubscriptionStatusBadge", () => {
  let SubscriptionStatusBadge: React.ComponentType<{ connectionState: string }>;

  beforeAll(async () => {
    const mod = await import("@/components/ui/SubscriptionStatusBadge");
    SubscriptionStatusBadge = mod.SubscriptionStatusBadge as React.ComponentType<{
      connectionState: string;
    }>;
  });

  it.each([
    ["connected", "Connected"],
    ["reconnecting", "Reconnecting"],
    ["disconnected", "Disconnected"],
    ["unavailable", "Unavailable"],
  ])("renders '%s' state as label '%s'", async (state, label) => {
    render(
      <SubscriptionStatusBadge
        connectionState={state as "connected" | "reconnecting" | "disconnected" | "unavailable"}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });

  it("has accessible aria-label for each state", () => {
    render(
      <SubscriptionStatusBadge connectionState="connected" />
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "WebSocket connection: Connected"
    );
  });
});

// ── LiveEventTicker ───────────────────────────────────────────────
describe("LiveEventTicker", () => {
  let LiveEventTicker: React.ComponentType<{ contractId: string }>;

  beforeAll(async () => {
    const mod = await import("@/components/events/LiveEventTicker");
    LiveEventTicker = mod.LiveEventTicker;
  });

  const sampleEvent = {
    id: "evt-1",
    eventType: "transfer",
    ledgerSequence: 12345,
    timestamp: new Date("2026-01-01T12:00:00Z").toISOString(),
    payload: '{"amount":"100"}',
  };

  beforeEach(() => {
    mockUseSubscription.mockReset();
  });

  it("renders the live events heading", () => {
    mockUseSubscription.mockReturnValue({
      events: [],
      loading: false,
      error: undefined,
      connectionState: "connected",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    expect(screen.getByText(/live events/i)).toBeInTheDocument();
  });

  it("renders events returned by the hook", () => {
    mockUseSubscription.mockReturnValue({
      events: [sampleEvent],
      loading: false,
      error: undefined,
      connectionState: "connected",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    expect(screen.getByText("TRANSFER")).toBeInTheDocument();
  });

  it("shows 'Waiting for events…' when connected but no events", () => {
    mockUseSubscription.mockReturnValue({
      events: [],
      loading: false,
      error: undefined,
      connectionState: "connected",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    expect(screen.getByText(/waiting for events/i)).toBeInTheDocument();
  });

  it("shows graceful degradation notice when unavailable", () => {
    mockUseSubscription.mockReturnValue({
      events: [],
      loading: false,
      error: undefined,
      connectionState: "unavailable",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    expect(
      screen.getByText(/real-time feed unavailable/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/falling back to polling/i)).toBeInTheDocument();
  });

  it("shows connecting message while loading", () => {
    mockUseSubscription.mockReturnValue({
      events: [],
      loading: true,
      error: undefined,
      connectionState: "disconnected",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("live region has aria-live=polite", () => {
    mockUseSubscription.mockReturnValue({
      events: [sampleEvent],
      loading: false,
      error: undefined,
      connectionState: "connected",
    });
    render(<LiveEventTicker contractId="CABC123" />);
    const list = screen.getByRole("list", { name: /recent contract events/i });
    expect(list).toHaveAttribute("aria-live", "polite");
  });
});
