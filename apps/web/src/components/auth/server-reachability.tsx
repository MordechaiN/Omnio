"use client";

import { createContext, useContext } from "react";

/**
 * Whether the api answered, and whether the person chose to work without it.
 *
 * Omnio's claim is that everything runs in your browser. That claim was not
 * quite true: an unreachable api replaced the entire application with a retry
 * screen, so 121 browser-tier tools — which need nothing but the browser — went
 * down with a server they never used. On a train, during a restart, or on a
 * laptop that had wandered off the network, the product simply stopped being a
 * product.
 *
 * `personal` is the default deployment: a single implicit local user with no
 * login at all (apps/api env, decision D2 as reversed 2026-07-18). There, the
 * gate protected nothing whatsoever — it was purely a dead end. Continuing
 * offline grants access to the browser's own storage and its own client-side
 * tools; it can never reach server data, because there is no server to reach.
 *
 * The choice stays explicit rather than automatic. A `multi-user` instance has
 * a real login boundary, and Omnio cannot tell which mode it is looking at
 * while the api is silent, so it asks instead of assuming.
 */
export interface ServerReachability {
  /** False once the person elected to continue without the api. */
  online: boolean;
}

const Context = createContext<ServerReachability>({ online: true });

/**
 * A real component rather than a re-exported `Context.Provider`.
 *
 * Exporting the provider object straight out of a "use client" module renders
 * nothing at all — silently, with no error — because a context provider is not
 * a function component and does not survive the module boundary as a client
 * reference. That produced a blank page instead of the application.
 */
export function ServerReachabilityProvider({
  value,
  children,
}: {
  value: ServerReachability;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useServerReachability(): ServerReachability {
  return useContext(Context);
}
