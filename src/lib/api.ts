"use client";

/** Small fetch wrapper: JSON in/out, throws Error(message) on !ok. */
export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const post = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const put = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const del = <T,>(path: string) => api<T>(path, { method: "DELETE" });

/** Upload an image; returns { id, url, width?, height? }. */
export async function uploadImage(file: File, kind: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return api<{ id: string; url: string; width?: number; height?: number }>(
    "/api/images",
    { method: "POST", body: form }
  );
}
