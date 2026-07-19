"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Label, Textarea } from "@omnio/ui";
import { evaluateRobots, parseRobots } from "../../shared/robots.ts";

const SAMPLE = ["User-agent: *", "Disallow: /admin/", "Allow: /admin/login", "Disallow: /*.json$"].join("\n");

/** robots.txt tester — paste rules, try a path and user-agent, see the verdict. */
export default function RobotsTestTool() {
  const t = useTranslations("mod-devlookup");
  const [robots, setRobots] = useState(SAMPLE);
  const [path, setPath] = useState("/admin/settings");
  const [agent, setAgent] = useState("Googlebot");

  const groups = parseRobots(robots);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const verdict = evaluateRobots(groups, agent, cleanPath);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-rules">{t("ui.robotsLabel")}</Label>
        <Textarea
          id="rb-rules"
          dir="ltr"
          className="min-h-36 font-mono text-sm"
          value={robots}
          spellCheck={false}
          onChange={(event) => setRobots(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-path">{t("ui.robotsPath")}</Label>
          <Input
            id="rb-path"
            dir="ltr"
            className="font-mono"
            value={path}
            spellCheck={false}
            onChange={(event) => setPath(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-agent">{t("ui.robotsAgent")}</Label>
          <Input
            id="rb-agent"
            dir="ltr"
            className="font-mono"
            value={agent}
            spellCheck={false}
            onChange={(event) => setAgent(event.target.value)}
          />
        </div>
      </div>

      <div
        aria-live="polite"
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          verdict.allowed ? "border-accent/40 bg-accent-subtle" : "border-border bg-surface"
        }`}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {verdict.allowed ? "✅" : "🚫"}
        </span>
        <span className="text-sm font-semibold">
          {verdict.allowed ? t("ui.robotsAllowed") : t("ui.robotsBlocked")}
        </span>
        {verdict.rule ? (
          <Badge variant="neutral">
            <span dir="ltr" className="font-mono">
              {verdict.rule.type === "allow" ? "Allow" : "Disallow"}: {verdict.rule.pattern}
            </span>
          </Badge>
        ) : (
          <span className="text-sm text-text-muted">{t("ui.robotsNoRule")}</span>
        )}
        {verdict.agents ? (
          <Badge variant="neutral">
            <span dir="ltr" className="font-mono">
              User-agent: {verdict.agents.join(", ")}
            </span>
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-text-muted">{t("ui.robotsNote")}</p>
    </div>
  );
}
