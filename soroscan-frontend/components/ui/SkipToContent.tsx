/**
 * SkipToContent – WCAG 2.1 AA §2.4.1 "Bypass Blocks"
 *
 * Renders a visually-hidden anchor that becomes visible on keyboard focus,
 * allowing keyboard users to bypass repeated navigation and jump straight
 * to the main content area.
 *
 * Usage: render as the very first child of <body>, before any navigation.
 * The target element must have id="main-content".
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={[
        /* Visually hidden by default */
        "absolute -translate-y-full left-4 top-4 z-9999",
        "rounded px-4 py-2",
        "bg-terminal-black text-terminal-green border border-terminal-green",
        "font-terminal-mono text-sm font-bold tracking-widest uppercase",
        /* Slide into view on focus */
        "focus:translate-y-0 focus:outline-none focus-visible:translate-y-0",
        "transition-transform duration-150",
      ].join(" ")}
    >
      Skip to main content
    </a>
  );
}
