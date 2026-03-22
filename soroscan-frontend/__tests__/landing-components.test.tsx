import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { CodeSnippet } from "@/components/terminal/landing/CodeSnippet"
import { Features } from "@/components/terminal/landing/Features"
import { Hero } from "@/components/terminal/landing/Hero"

// ── Mock next/navigation (usePathname, useRouter) ──────────────────
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
}))

// ── Mock @/lib/auth ────────────────────────────────────────────────
jest.mock("@/lib/auth", () => ({
  isLoggedIn: jest.fn(() => false),
  clearTokens: jest.fn(),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  setTokens: jest.fn(),
  refreshAccessToken: jest.fn(),
}))

// ── Mock next/link to simple <a> ───────────────────────────────────
jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

// ── CodeSnippet ────────────────────────────────────────────────────
describe("CodeSnippet", () => {
  it("renders the provided code string", () => {
    render(<CodeSnippet code={"const x = 1"} language="typescript" />)
    expect(screen.getByText(/x/)).toBeInTheDocument()
  })

  it("shows a filename when provided", () => {
    render(
      <CodeSnippet code={"print('hi')"} language="python" filename="test.py" />
    )
    expect(screen.getByText("test.py")).toBeInTheDocument()
  })

  it("renders a COPY button", () => {
    render(<CodeSnippet code={"echo hello"} language="bash" />)
    expect(
      screen.getByRole("button", { name: /copy code/i })
    ).toBeInTheDocument()
  })

  it("shows all line numbers for multi-line code", () => {
    const multiLine = "line1\nline2\nline3"
    render(<CodeSnippet code={multiLine} language="bash" />)
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })
})

// ── Hero ───────────────────────────────────────────────────────────
describe("Hero", () => {
  it("renders the main headline", () => {
    render(<Hero />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "SOROSCAN"
    )
  })

  it("renders CTA buttons linking to /docs", () => {
    render(<Hero />)
    const links = screen.getAllByRole("link")
    const docLinks = links.filter((el) => el.getAttribute("href") === "/docs")
    expect(docLinks.length).toBeGreaterThanOrEqual(2)
  })

  it("renders stat labels", () => {
    render(<Hero />)
    expect(screen.getByText("EVENTS_INDEXED")).toBeInTheDocument()
    expect(screen.getByText("UPTIME")).toBeInTheDocument()
  })
})

// ── Features ───────────────────────────────────────────────────────
describe("Features", () => {
  it("renders the section heading", () => {
    render(<Features />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "[SYSTEM_CAPABILITIES]"
    )
  })

  it("renders all 6 feature card titles", () => {
    render(<Features />)
    const titles = [
      "SOROBAN_NATIVE",
      "DJANGO_BACKEND",
      "GRAPHQL_PLAYGROUND",
      "WEBHOOK_SUBSCRIPTIONS",
      "HORIZON_INTEGRATION",
      "DEVELOPER_FIRST",
    ]
    titles.forEach((t) => {
      expect(screen.getAllByText(t).length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ── Navbar ─────────────────────────────────────────────────────────
describe("Navbar", () => {
  let Navbar: React.ComponentType

  beforeAll(async () => {
    const mod = await import("@/components/terminal/landing/Navbar")
    Navbar = mod.Navbar
  })

  it("renders the logo text", () => {
    render(<Navbar />)
    expect(screen.getByText("[SOROSCAN]")).toBeInTheDocument()
  })

  it("renders desktop nav links", () => {
    render(<Navbar />)
    expect(screen.getAllByText("DOCS").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("FEATURES").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("GITHUB").length).toBeGreaterThanOrEqual(1)
  })

  it("toggles mobile menu on hamburger click", () => {
    render(<Navbar />)
    const toggle = screen.getByRole("button", { name: /toggle menu/i })
    // Before click — only desktop links (could be 1 or more)
    const before = screen.getAllByText("DOCS").length
    fireEvent.click(toggle)
    // After click — mobile menu adds an extra set of links
    const after = screen.getAllByText("DOCS").length
    expect(after).toBeGreaterThan(before)
  })
})
