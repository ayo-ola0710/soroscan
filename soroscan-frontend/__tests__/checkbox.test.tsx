import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"
import { Checkbox } from "@/components/ui/Checkbox"

function CheckboxHarness({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = React.useState(false)

  return (
    <Checkbox
      id="terms"
      label="Accept terms"
      checked={checked}
      disabled={disabled}
      onCheckedChange={setChecked}
    />
  )
}

describe("Checkbox", () => {
  it("links the label with htmlFor and toggles on label click", () => {
    const onCheckedChange = jest.fn()

    render(<Checkbox id="newsletter" label="Subscribe" checked={false} onCheckedChange={onCheckedChange} />)

    const label = screen.getByText("Subscribe")
    const input = screen.getByRole("checkbox", { name: "Subscribe" })

    expect(input).toHaveAttribute("id", "newsletter")
    expect(label.closest("label")).toHaveAttribute("for", "newsletter")

    fireEvent.click(label)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it("exposes mixed state through aria-checked and DOM indeterminate", () => {
    render(<Checkbox id="filters" label="Select all" checked={false} indeterminate onCheckedChange={jest.fn()} />)

    const input = screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement

    expect(input).toHaveAttribute("aria-checked", "mixed")
    expect(input.indeterminate).toBe(true)
  })

  it("is focusable and can be toggled with Space key", async () => {
    const user = userEvent.setup()
    render(<CheckboxHarness />)

    const input = screen.getByRole("checkbox", { name: "Accept terms" })
    await user.tab()

    expect(input).toHaveFocus()

    await user.keyboard("[Space]")
    expect(input).toBeChecked()
  })

  it("applies disabled semantics and prevents interaction", () => {
    render(<CheckboxHarness disabled />)

    const input = screen.getByRole("checkbox", { name: "Accept terms" })
    const label = screen.getByText("Accept terms").closest("label")

    expect(input).toBeDisabled()
    expect(input).toHaveAttribute("aria-disabled", "true")
    expect(label).toHaveClass("cursor-not-allowed")

    fireEvent.click(screen.getByText("Accept terms"))
    expect(input).not.toBeChecked()
  })
})