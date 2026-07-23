"use client";

import { useState } from "react";

export type UpdateStatus = "idle" | "checking" | "latest" | "available" | "error";

export interface UpdateState {
  status: UpdateStatus;
  /** The newest version available upstream, when known. */
  latest?: string;
}

/**
 * Manual "Check for updates" for the Settings page.
 *
 * Architecture: the version is the single source of truth, and today a personal
 * Omnio deployment has no upstream release feed to compare against — the running
 * build is authoritative, so a successful check reports "latest". When a release
 * manifest/endpoint exists, only the fetch-and-compare inside `check()` changes;
 * the returned shape and the UI stay the same, so real update checks slot in
 * without touching callers.
 */
export function useUpdateCheck() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  async function check() {
    setState({ status: "checking" });
    try {
      const res = await fetch("/api/version", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`version endpoint ${res.status}`);
      const data = (await res.json()) as { version: string };
      // No upstream feed yet → the running version is the latest.
      setState({ status: "latest", latest: data.version });
    } catch {
      setState({ status: "error" });
    }
  }

  return { ...state, check };
}
