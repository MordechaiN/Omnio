"use client";

import { useQuery } from "@tanstack/react-query";

/** The complete release manifest from `GET /api/version`. */
export interface VersionResponse {
  version: string;
  channel: string;
  commit: string;
  branch: string;
  buildNumber: string;
  buildTimestamp: string;
  environment: string;
  mode: string;
  dockerImages: string[];
  hostname: string;
  os: string;
  arch: string;
  node: string;
  pnpm: string;
  database: string;
  redis: string | null;
}

export type ServiceHealth = "healthy" | "warning" | "offline";
export type ServicesResponse = Record<
  "api" | "database" | "redis" | "worker" | "storage",
  ServiceHealth
>;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return (await res.json()) as T;
}

/** Live release manifest of the running deployment. */
export function useVersion() {
  return useQuery({
    queryKey: ["version"],
    queryFn: () => fetchJson<VersionResponse>("/api/version"),
    staleTime: 60_000,
    retry: 1,
  });
}

/** Live per-service health for the About page. */
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => fetchJson<ServicesResponse>("/api/health"),
    refetchInterval: 30_000,
    retry: 1,
  });
}
