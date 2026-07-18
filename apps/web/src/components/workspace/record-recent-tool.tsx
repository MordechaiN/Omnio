"use client";

import { useEffect } from "react";
import { recordRecentTool } from "@/lib/preferences";
import { recordToolUsage } from "@/lib/usage-stats";

/**
 * Records a visit to a tool: surfaces it under "Recent" on the home, and
 * bumps its local usage counter (the Stats page's only data source).
 */
export function RecordRecentTool({ id }: { id: string }) {
  useEffect(() => {
    recordRecentTool(id);
    recordToolUsage(id);
  }, [id]);
  return null;
}
