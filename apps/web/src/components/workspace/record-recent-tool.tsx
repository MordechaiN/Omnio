"use client";

import { useEffect } from "react";
import { recordRecentTool } from "@/lib/preferences";

/** Records a visit to a tool so it surfaces under "Recent" on the home. */
export function RecordRecentTool({ id }: { id: string }) {
  useEffect(() => {
    recordRecentTool(id);
  }, [id]);
  return null;
}
