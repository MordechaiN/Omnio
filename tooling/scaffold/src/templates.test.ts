import { describe, expect, it } from "vitest";
import { manifestJson, surfaceTsx, toPascalCase } from "./templates";

const options = { id: "color-picker", category: "utilities", toolId: "color-picker" };

describe("scaffold templates", () => {
  it("PascalCases kebab ids", () => {
    expect(toPascalCase("color-picker")).toBe("ColorPicker");
  });

  it("emits a manifest with the expected id, namespace, and tool", () => {
    const manifest = JSON.parse(manifestJson(options)) as {
      id: string;
      i18nNamespace: string;
      tools: { id: string; tier: string }[];
    };
    expect(manifest.id).toBe("color-picker");
    expect(manifest.i18nNamespace).toBe("mod-color-picker");
    expect(manifest.tools[0]).toMatchObject({ id: "color-picker", tier: "browser" });
  });

  it("emits a client surface bound to the module namespace", () => {
    const tsx = surfaceTsx(options);
    expect(tsx).toContain('"use client"');
    expect(tsx).toContain('useTranslations("mod-color-picker")');
    expect(tsx).toContain("export default function ColorPickerTool()");
  });
});
