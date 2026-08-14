import { describe, expect, it } from "vitest";
import { sortLabels, type Label } from "@/lib/types";

function label(name: string, id = name): Label {
  return {
    id,
    user_id: "user-1",
    name,
    color: "#0D9488",
    created_at: "2026-08-01T00:00:00.000Z",
  };
}

describe("sortLabels", () => {
  it("sorts by name without mutating the original list", () => {
    const input = [label("Zebra"), label("apple"), label("Bug")];
    const sorted = sortLabels(input);
    expect(sorted.map((l) => l.name)).toEqual(["apple", "Bug", "Zebra"]);
    expect(input.map((l) => l.name)).toEqual(["Zebra", "apple", "Bug"]);
  });
});
