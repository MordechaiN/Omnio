"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthStatus, Identity } from "@omnio/contracts";
import { apiClient } from "./client";

const AUTH_STATUS_KEY = ["auth", "status"] as const;

interface Credentials {
  username: string;
  password: string;
}

function errorMessage(body: unknown, fallback: string): string {
  return (body as { message?: string } | null)?.message ?? fallback;
}

export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: AUTH_STATUS_KEY,
    queryFn: async () => {
      const res = await apiClient.auth.status();
      if (res.status !== 200) throw new Error("Could not reach the server.");
      return res.body;
    },
  });
}

export function useSetup() {
  const queryClient = useQueryClient();
  return useMutation<Identity, Error, Credentials>({
    mutationFn: async (input) => {
      const res = await apiClient.auth.setup({ body: input });
      if (res.status !== 201) throw new Error(errorMessage(res.body, "Setup failed."));
      return res.body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<Identity, Error, Credentials>({
    mutationFn: async (input) => {
      const res = await apiClient.auth.login({ body: input });
      if (res.status !== 200)
        throw new Error(errorMessage(res.body, "Incorrect username or password."));
      return res.body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.auth.logout({ body: undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY }),
  });
}
