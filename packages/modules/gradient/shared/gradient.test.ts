import { describe, expect, it } from "vitest";
import { buildGradient, gradientCss } from "./gradient.ts";

describe("buildGradient", () => {
  it("builds a linear gradient with angle", () => {
    const g = buildGradient("linear", 90, [{ color: "#000" }, { color: "#fff" }]);
    expect(g).toBe("linear-gradient(90deg, #000, #fff)");
  });

  it("includes clamped stop positions", () => {
    const g = buildGradient("linear", 0, [
      { color: "red", position: -10 },
      { color: "blue", position: 150 },
    ]);
    expect(g).toBe("linear-gradient(0deg, red 0%, blue 100%)");
  });

  it("normalizes the angle into 0–359", () => {
    expect(buildGradient("linear", 450, [{ color: "a" }, { color: "b" }])).toContain("90deg");
  });

  it("builds a radial gradient", () => {
    expect(buildGradient("radial", 0, [{ color: "a" }, { color: "b" }])).toBe(
      "radial-gradient(circle, a, b)",
    );
  });
});

describe("gradientCss", () => {
  it("wraps the value in a background declaration", () => {
    expect(gradientCss("linear-gradient(0deg, a, b)")).toBe("background: linear-gradient(0deg, a, b);");
  });
});
