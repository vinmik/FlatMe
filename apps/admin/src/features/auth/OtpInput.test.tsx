import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./OtpInput";

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <OtpInput value={value} onChange={setValue} onComplete={onComplete} autoFocus />
      <output data-testid="value">{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole("textbox");

describe("OtpInput", () => {
  it("renders labelled boxes and focuses the first one", () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
    expect(screen.getByLabelText("Digit 1 of 6")).toHaveFocus();
  });

  it("auto-advances while typing, ignores non-digits and completes", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<Harness onComplete={onComplete} />);
    await user.keyboard("12a3");
    expect(screen.getByTestId("value")).toHaveTextContent("123");
    expect(boxes()[3]).toHaveFocus();
    await user.keyboard("456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("fills every box from a paste", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<Harness onComplete={onComplete} />);
    await user.paste("Your code: 987-654");
    expect(screen.getByTestId("value")).toHaveTextContent("987654");
    expect(onComplete).toHaveBeenCalledWith("987654");
  });

  it("backspace clears and moves to the previous box", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("12");
    expect(boxes()[2]).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(screen.getByTestId("value")).toHaveTextContent(/^1$/);
    expect(boxes()[1]).toHaveFocus();
  });
});
