"use client";

import { useQuery } from "@tanstack/react-query";

/** Shape of `GET /api/version` — the running deployment's own report. */
export interface VersionResponse {
  version: string;
  commit: string;
  branch: string;
  buildDate: string;
  buildNumber: string;
  environment: string;
  mode: string;
}

async function fetchVersion(): Promise<VersionResponse> {
  const res = await fetch("/api/version", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`version endpoint returned ${res.status}`);
  return (await res.json()) as VersionResponse;
}

/** Live version of the running deployment (mode, environment, build status). */
export function useVersion() {
  return useQuery({
    queryKey: ["version"],
    queryFn: fetchVersion,
    staleTime: 60_000,
    retry: 1,
  });
}
