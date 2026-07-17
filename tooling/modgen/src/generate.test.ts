import type { ModuleManifest } from "@omnio/module-sdk";
import { describe, expect, it } from "vitest";
import { generateRegistries } from "./generate";
import type { LoadedModule } from "./validate";

function loaded(manifest: ModuleManifest): LoadedModule {
  return { dir: manifest.id, manifest };
}

const browserModule: ModuleManifest = {
  id: "utilities",
  version: "1.0.0",
  category: "utilities",
  icon: "wrench",
  i18nNamespace: "mod-utilities",
  permissions: [],
  tools: [{ id: "uuid", tier: "browser", surface: "frontend/tools/uuid", keywords: ["guid"] }],
};

const workerModule: ModuleManifest = {
  id: "image",
  version: "1.0.0",
  category: "images",
  icon: "image",
  i18nNamespace: "mod-image",
  permissions: [],
  capabilities: { fileActions: [{ toolId: "resize", verb: "resize", rank: 30 }] },
  tools: [
    {
      id: "resize",
      tier: "worker",
      tierReason: "needs sharp",
      surface: "frontend/tools/resize",
      accepts: [{ mime: ["image/png", "image/jpeg"] }],
    },
  ],
};

const serverModule: ModuleManifest = {
  id: "text",
  version: "1.0.0",
  category: "text",
  icon: "type",
  i18nNamespace: "mod-text",
  permissions: [],
  tools: [{ id: "slug", tier: "server", tierReason: "shared lib", surface: "frontend/tools/slug" }],
};

describe("generateRegistries", () => {
  const out = generateRegistries([
    loaded(workerModule),
    loaded(browserModule),
    loaded(serverModule),
  ]);

  it("emits a search entry per tool with a stable href", () => {
    expect(out.searchTs).toContain('id: "utilities.uuid"');
    expect(out.searchTs).toContain("/tool/utilities/uuid");
    expect(out.searchTs).toContain('keywords: ["guid"]');
  });

  it("lazy-imports each surface from its module package", () => {
    expect(out.webTs).toContain('import("@omnio/mod-utilities/frontend/tools/uuid")');
    expect(out.webTs).toContain('import("@omnio/mod-image/frontend/tools/resize")');
  });

  it("maps worker-tier tools to their processors", () => {
    expect(out.workerTs).toContain('from "@omnio/mod-image/worker/tools/resize"');
    expect(out.workerTs).toContain('"image.resize":');
    expect(out.workerTs).not.toContain("utilities/worker");
  });

  it("lists only server-tier modules in the api registry", () => {
    expect(out.apiTs).toContain('from "@omnio/mod-text/server"');
    expect(out.apiTs).not.toContain("mod-utilities/server");
  });

  it("builds the capability map from fileActions and tool accepts", () => {
    const caps = JSON.parse(out.capabilitiesJson) as {
      byMime: Record<string, { toolId: string; verb: string; rank: number }[]>;
    };
    expect(caps.byMime["image/png"]).toEqual([
      { moduleId: "image", toolId: "resize", verb: "resize", rank: 30 },
    ]);
  });

  it("returns module packages sorted for transpilePackages", () => {
    expect(out.modulePackages).toEqual([
      "@omnio/mod-image",
      "@omnio/mod-text",
      "@omnio/mod-utilities",
    ]);
  });
});
