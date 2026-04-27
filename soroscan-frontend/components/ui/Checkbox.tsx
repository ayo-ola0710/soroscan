"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "onChange"> {
  label: React.ReactNode
  checked: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    id,
    className,
    label,
    checked,
    indeterminate = false,
    disabled = false,
    onCheckedChange,
    ...props
  },
  ref
) {
  const generatedId = React.useId()
  const checkboxId = id ?? `checkbox-${generatedId}`
  const internalRef = React.useRef<HTMLInputElement>(null)

  React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

  React.useEffect(() => {
    if (!internalRef.current) {
      return
    }

    // `indeterminate` is a DOM property and must be set imperatively.
    internalRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <div className={cn("inline-flex items-center", disabled && "cursor-not-allowed", className)}>
      <input
        ref={internalRef}
        id={checkboxId}
        type="checkbox"
        role="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : checked}
        aria-disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        {...props}
      />

      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium",
          disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border transition-colors",
            "peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
            checked || indeterminate
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background",
            disabled && "opacity-60"
          )}
        >
          {indeterminate ? (
            <span className="h-0.5 w-2 rounded bg-current" />
          ) : checked ? (
            <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current" aria-hidden="true">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : null}
        </span>

        <span>{label}</span>
      </label>
    </div>
  )
})

Checkbox.displayName = "Checkbox"

export { Checkbox }