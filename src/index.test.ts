import { describe, expect, it } from "vitest";
import { greet } from "./index.js";

describe("greet", () => {
  it("greets by name", () => {
    expect(greet("Mara")).toBe("Hello, Mara");
  });
});
