/**
 * Accessibility (WCAG 2.1 AA) tests
 * ────────────────────────────────────────────────────────────────────
 * Tests are intentionally kept to RTL / jest-dom assertions only —
 * no axe-core runtime dependency — so they run in the existing CI
 * environment without additional installs.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SkipToContent } from "@/components/ui/SkipToContent";

// ── Mock next/navigation ──────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// ── Mock @/lib/auth ────────────────────────────────────────────────────
jest.mock("@/lib/auth", () => ({
  isLoggedIn: jest.fn(() => false),
  clearTokens: jest.fn(),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  setTokens: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

// ── Mock next/link ─────────────────────────────────────────────────────
jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// ── SkipToContent ────────────────────────────────────────────────────
describe("SkipToContent", () => {
  it("renders an anchor element", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
  });

  it("points to #main-content", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveAttribute("href", "#main-content");
  });
});

// ── Navbar ARIA ───────────────────────────────────────────────────────
describe("Navbar ARIA attributes", () => {
  let Navbar: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("@/components/terminal/landing/Navbar");
    Navbar = mod.Navbar;
  });

  it("hamburger button has aria-label", () => {
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: /toggle menu/i });
    expect(toggle).toHaveAttribute("aria-label", "Toggle menu");
  });

  it("hamburger button has aria-expanded=false by default", () => {
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: /toggle menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("hamburger button has aria-controls pointing to mobile-menu", () => {
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: /toggle menu/i });
    expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");
  });
});
