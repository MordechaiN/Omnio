import type { FileObjectDto } from "@omnio/contracts";
import { API_BASE_URL } from "./client";

/**
 * Upload a single file into scratch storage. Binary transfer sits outside the
 * ts-rest JSON contract, so this is a raw multipart POST — the busboy handler on
 * the api reads exactly one file part (docs/architecture/06-security.md §3).
 */
export async function uploadFile(file: File, signal?: AbortSignal): Promise<FileObjectDto> {
  const body = new FormData();
  body.append("file", file, file.name);

  const res = await fetch(`${API_BASE_URL}/api/v1/files`, {
    method: "POST",
    body,
    credentials: "include",
    signal,
  });

  if (res.status !== 201) {
    throw new Error(await errorMessage(res, "Upload failed."));
  }
  return (await res.json()) as FileObjectDto;
}

/** Attachment download URL for a stored file's bytes. */
export function fileContentUrl(id: string): string {
  return `${API_BASE_URL}/api/v1/files/${id}/content`;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}
