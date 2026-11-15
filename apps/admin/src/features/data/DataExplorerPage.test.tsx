import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderApp, SLOW, stubLayoutApis } from "@/test/renderApp";

vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return { ...actual, config: { ...actual.config, authDisabled: true } };
});

beforeAll(stubLayoutApis);

describe("Data Explorer", () => {
  it("loads containers and documents, runs a query and edits a document", { timeout: 60_000 }, async () => {
    const user = userEvent.setup();
    renderApp("/data");

    expect(await screen.findByRole("heading", { level: 1, name: "Data Explorer" }, SLOW)).toBeInTheDocument();
    const containers = await screen.findByRole("radiogroup", { name: "Container" }, SLOW);
    for (const name of ["users", "listings", "otps", "inquiries", "reports", "audit"]) {
      expect(within(containers).getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(within(containers).getByRole("radio", { name: "users" })).toHaveAttribute("aria-checked", "true");

    const rows = await screen.findAllByRole("row", { name: /^Open / }, SLOW);
    expect(rows).toHaveLength(25);
    expect(screen.getByText(/25 items loaded \(more available\)/)).toBeInTheDocument();

    // SQL mode: read-only validation surfaces as a friendly error.
    await user.click(screen.getByRole("radio", { name: /sql query/i }));
    const editor = screen.getByLabelText("SQL query");
    fireEvent.change(editor, { target: { value: "DELETE FROM c" } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    expect(await screen.findByText(/only select/i, undefined, SLOW)).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: "SELECT * FROM c WHERE c.role = 'admin'" } });
    await user.click(screen.getByRole("button", { name: /run query/i }));
    const adminRow = (await screen.findAllByRole("row", { name: /^Open / }, SLOW))[0]!;

    // Open → edit → save is recorded and reflected in the drawer.
    await user.click(adminRow);
    const drawer = await screen.findByRole("dialog");
    const json = await within(drawer).findByLabelText("Document JSON", undefined, SLOW);
    const doc = JSON.parse(json.textContent ?? "{}") as Record<string, unknown>;
    expect(doc._etag).toEqual(expect.any(String));

    await user.click(within(drawer).getByRole("button", { name: /edit json/i }));
    const textarea = within(drawer).getByLabelText("Document JSON");
    fireEvent.change(textarea, { target: { value: JSON.stringify({ ...doc, id: "changed" }) } });
    expect(within(drawer).getByText(/the id can't be changed/i)).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /save document/i })).toBeDisabled();

    fireEvent.change(textarea, { target: { value: JSON.stringify({ ...doc, designation: "Data steward" }) } });
    await user.click(within(drawer).getByRole("button", { name: /save document/i }));
    expect(await screen.findByText("Document saved", undefined, SLOW)).toBeInTheDocument();
    await waitFor(() => expect(within(drawer).getByLabelText("Document JSON").textContent).toContain("Data steward"), SLOW);
  });
});
