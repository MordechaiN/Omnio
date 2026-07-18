import { describe, expect, it } from "vitest";
import { convertCase, toWords } from "./case-convert.ts";

describe("case conversion", () => {
  it("splits camelCase and separators into words", () => {
    expect(toWords("helloWorld-foo_bar baz")).toEqual(["hello", "World", "foo", "bar", "baz"]);
  });

  it("converts between styles", () => {
    const input = "hello world example";
    expect(convertCase(input, "camel")).toBe("helloWorldExample");
    expect(convertCase(input, "pascal")).toBe("HelloWorldExample");
    expect(convertCase(input, "snake")).toBe("hello_world_example");
    expect(convertCase(input, "constant")).toBe("HELLO_WORLD_EXAMPLE");
    expect(convertCase(input, "kebab")).toBe("hello-world-example");
    expect(convertCase(input, "title")).toBe("Hello World Example");
  });

  it("round-trips from camelCase back to kebab", () => {
    expect(convertCase("myVariableName", "kebab")).toBe("my-variable-name");
  });

  it("upper/lower operate on the whole string", () => {
    expect(convertCase("AbC", "upper")).toBe("ABC");
    expect(convertCase("AbC", "lower")).toBe("abc");
  });

  it("handles empty input", () => {
    expect(convertCase("   ", "camel")).toBe("");
  });
});
