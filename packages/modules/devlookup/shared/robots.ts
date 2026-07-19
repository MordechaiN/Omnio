/**
 * robots.txt evaluation — longest-match rule per the Robots Exclusion
 * Protocol (RFC 9309): group rules by user-agent, pick the most specific
 * agent group, then the longest matching path rule wins; Allow beats
 * Disallow on ties. Supports `*` wildcards and `$` end anchors.
 */
export interface RobotsRule {
  type: "allow" | "disallow";
  pattern: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]!.trim();
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ type: field, pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function patternMatches(pattern: string, path: string): number {
  // Returns the pattern's specificity (its length) when it matches, else -1.
  if (pattern === "") return -1;
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`^${parts.join(".*")}${anchored ? "$" : ""}`);
  return regex.test(path) ? pattern.length : -1;
}

export interface RobotsVerdict {
  allowed: boolean;
  /** The rule that decided it, if any (no match = allowed by default). */
  rule?: RobotsRule;
  /** Which agent group applied. */
  agents?: string[];
}

export function evaluateRobots(groups: RobotsGroup[], userAgent: string, path: string): RobotsVerdict {
  const ua = userAgent.toLowerCase();
  // Most specific agent match: exact substring beats "*".
  let group = groups.find((g) => g.agents.some((agent) => agent !== "*" && ua.includes(agent)));
  group ??= groups.find((g) => g.agents.includes("*"));
  if (!group) return { allowed: true };

  let best: { rule: RobotsRule; specificity: number } | null = null;
  for (const rule of group.rules) {
    const specificity = patternMatches(rule.pattern, path);
    if (specificity < 0) continue;
    if (
      !best ||
      specificity > best.specificity ||
      (specificity === best.specificity && rule.type === "allow" && best.rule.type === "disallow")
    ) {
      best = { rule, specificity };
    }
  }
  if (!best) return { allowed: true, agents: group.agents };
  return { allowed: best.rule.type === "allow", rule: best.rule, agents: group.agents };
}
