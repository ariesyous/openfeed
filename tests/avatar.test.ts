import { describe, expect, it } from "vitest";
import { getAvatarProps, hashString } from "../src/lib/avatar";

describe("hashString", () => {
  it("is deterministic for the same input", () => {
    expect(hashString("acc-example")).toBe(hashString("acc-example"));
  });

  it("differs for different inputs (no trivial collisions in this sample)", () => {
    expect(hashString("acc-alice")).not.toBe(hashString("acc-bob"));
  });
});

describe("getAvatarProps", () => {
  it("is deterministic for the same seed key, name, and handle", () => {
    const a = getAvatarProps("acc-1", "Ada Lovelace", "ada");
    const b = getAvatarProps("acc-1", "Ada Lovelace", "ada");
    expect(a).toEqual(b);
  });

  it("derives initials from the first two words of a multi-word display name", () => {
    expect(getAvatarProps("acc-1", "Ada Lovelace", "ada").initials).toBe("AL");
  });

  it("falls back to the handle when the display name is a single short word", () => {
    expect(getAvatarProps("acc-1", "X", "xylophone").initials).toBe("XY");
  });

  it("produces different gradients for different seed keys", () => {
    const a = getAvatarProps("acc-alice", "Alice", "alice");
    const b = getAvatarProps("acc-bob", "Bob", "bob");
    expect(a.colorA).not.toBe(b.colorA);
  });
});
