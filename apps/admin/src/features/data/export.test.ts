import { describe, expect, it } from "vitest";
import { csvEscape, toCsvExport, toJsonExport } from "./export";

describe("data explorer export", () => {
  it("exports JSON as a pretty-printed array", () => {
    const items = [{ id: "a", n: 1 }, { id: "b", nested: { x: [1, 2] } }];
    expect(JSON.parse(toJsonExport(items))).toEqual(items);
    expect(toJsonExport([])).toBe("[]\n");
  });

  it("flattens top-level fields into the union of columns, stringifying nested values", () => {
    const csv = toCsvExport([
      { id: "u1", age: 30, tags: ["a", "b"] },
      { id: "u2", active: true, contact: { email: "x@y.in" } },
    ]);
    expect(csv).toBe(
      [
        "id,age,tags,active,contact",
        'u1,30,"[""a"",""b""]",,',
        'u2,,,true,"{""email"":""x@y.in""}"',
        "",
      ].join("\r\n"),
    );
  });

  it("escapes commas, quotes, newlines and padded text, and neutralises formulas", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvEscape("two\nlines")).toBe('"two\nlines"');
    expect(csvEscape(" padded")).toBe('" padded"');
    expect(toCsvExport([{ f: "=HYPERLINK(1)", n: -5 }])).toBe("f,n\r\n'=HYPERLINK(1),-5\r\n");
  });

  it("puts scalar query results in a value column", () => {
    expect(toCsvExport([3, "x", null])).toBe("value\r\n3\r\nx\r\n\r\n");
    expect(toCsvExport([])).toBe("");
  });
});
