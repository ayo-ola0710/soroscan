"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "../Button"
import { Menu, X, LogOut } from "lucide-react"
import { isLoggedIn, clearTokens } from "@/lib/auth"
import { useRouter } from "next/navigation"

const navLinks = [
  { href: "/docs",      label: "DOCS" },
  { href: "/features",  label: "FEATURES" },
  { href: "/api/docs/", label: "API_DOCS", external: true },
  { href: "https://github.com/SoroScan/soroscan", label: "GITHUB", external: true },
]

export function Navbar() {
  const [open, setOpen] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    setAuthenticated(isLoggedIn())
  }, [pathname])

  const handleLogout = () => {
    clearTokens()
    setAuthenticated(false)
    router.push("/")
  }

  return (
    <nav className="border-b border-terminal-green/30 px-6 md:px-8 py-4 flex flex-col bg-terminal-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="text-terminal-green text-lg md:text-xl font-bold tracking-tighter hover:text-terminal-cyan transition-colors font-terminal-mono"
        >
          [SOROSCAN]
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-6 lg:gap-8 text-xs text-terminal-gray uppercase tracking-widest items-center">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-terminal-green transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-terminal-green transition-colors ${
                  pathname === link.href ? "text-terminal-green underline underline-offset-4" : ""
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

          <div className="hidden md:flex items-center gap-3">
            {authenticated ? (
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleLogout}
                className="group"
              >
                <LogOut size={14} className="mr-2 group-hover:text-terminal-danger transition-colors" />
                LOGOUT
              </Button>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="secondary">SIGN_IN</Button>
              </Link>
            )}
            
            <a
              href="/api/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block"
            >
              <Button size="sm" variant="secondary">GET_API_KEY</Button>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-terminal-green hover:text-terminal-cyan transition-colors p-1"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-haspopup="true"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className="md:hidden mt-4 pb-2 border-t border-terminal-green/20 pt-4 flex flex-col gap-4 text-xs uppercase tracking-widest text-terminal-gray"
        >
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-terminal-green transition-colors py-1"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-terminal-green transition-colors py-1 ${
                  pathname === link.href ? "text-terminal-green" : ""
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            )
          )}
          {authenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:text-terminal-danger transition-colors py-1 text-left"
            >
              <LogOut size={14} />
              LOGOUT
            </button>
          ) : (
            <Link
              href="/login"
              className={`hover:text-terminal-green transition-colors py-1 ${
                pathname === "/login" ? "text-terminal-green" : ""
              }`}
              onClick={() => setOpen(false)}
            >
              SIGN_IN
            </Link>
          )}
          <a href="/api/docs/" target="_blank" rel="noopener noreferrer" className="mt-2">
            <Button size="sm" variant="secondary" className="w-full justify-center">GET_API_KEY</Button>
          </a>
        </div>
      )}
    </nav>
  )
}
