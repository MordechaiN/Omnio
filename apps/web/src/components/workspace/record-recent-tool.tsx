"use client";

import { useEffect } from "react";
import { recordToolEvent } from "@/lib/api/analytics";
import { recordRecentTool } from "@/lib/preferences";

/**
 * Records a visit to a tool: surfaces it under "Recent" on the home (a local,
 * on-device convenience — never shown to anyone else), and reports an
 * anonymous usage event to the platform's opt-in aggregate statistics
 * (Settings → About → Statistics; off by default, decision D5).
 */
export function RecordRecentTool({ id }: { id: string }) {
  useEffect(() => {
    recordRecentTool(id);
    recordToolEvent(id);
  }, [id]);
  return null;
}
