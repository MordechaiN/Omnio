import { describe, expect, it } from "vitest";
import { parseHeaderBlock } from "./headers.ts";
import { evaluateRobots, parseRobots } from "./robots.ts";

describe("parseHeaderBlock", () => {
  it("parses headers and flags known ones", () => {
    const parsed = parseHeaderBlock(
      "HTTP/1.1 200 OK\nContent-Type: text/html\nX-Custom: hello\ncache-control: max-age=60",
    );
    expect(parsed.statusLine).toBe("HTTP/1.1 200 OK");
    expect(parsed.headers).toHaveLength(3);
    expect(parsed.headers[0]).toMatchObject({ name: "Content-Type", knownKey: "content-type" });
    expect(parsed.headers[1]!.knownKey).toBeUndefined();
    expect(parsed.headers[2]!.knownKey).toBe("cache-control");
  });

  it("keeps colons inside values and skips junk lines", () => {
    const parsed = parseHeaderBlock("Location: https://a.example/path?x=1\n???\n: bad");
    expect(parsed.headers).toHaveLength(1);
    expect(parsed.headers[0]!.value).toBe("https://a.example/path?x=1");
  });
});

describe("robots evaluation", () => {
  const robots = parseRobots(
    [
      "User-agent: *",
      "Disallow: /private/",
      "Allow: /private/help",
      "Disallow: /*.pdf$",
      "",
      "User-agent: examplebot",
      "Disallow: /",
    ].join("\n"),
  );

  it("applies longest-match with allow winning ties", () => {
    expect(evaluateRobots(robots, "SomeBrowser", "/public").allowed).toBe(true);
    expect(evaluateRobots(robots, "SomeBrowser", "/private/data").allowed).toBe(false);
    expect(evaluateRobots(robots, "SomeBrowser", "/private/help").allowed).toBe(true);
  });

  it("supports wildcards and end anchors", () => {
    expect(evaluateRobots(robots, "SomeBrowser", "/docs/file.pdf").allowed).toBe(false);
    expect(evaluateRobots(robots, "SomeBrowser", "/docs/file.pdfx").allowed).toBe(true);
  });

  it("prefers the specific agent group", () => {
    expect(evaluateRobots(robots, "ExampleBot/2.0", "/anything").allowed).toBe(false);
  });

  it("allows by default with no matching rule or group", () => {
    expect(evaluateRobots(parseRobots(""), "x", "/a").allowed).toBe(true);
  });
});
