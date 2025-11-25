// @ts-nocheck
/** biome-ignore-all lint: generated file */

/**
 * Custom fetch wrapper for Modal API authentication.
 * Automatically adds Modal-Key and Modal-Secret headers to all requests.
 */

type ModalFetchConfig = {
  modalKey: string;
  modalSecret: string;
};

let config: ModalFetchConfig | null = null;

export function setModalAuth(modalKey: string, modalSecret: string) {
  config = { modalKey, modalSecret };
}

export async function modalFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  if (!config) {
    throw new Error(
      "Modal auth not configured. Call setModalAuth() before making requests.",
    );
  }

  const headers = new Headers(options?.headers);
  headers.set("Modal-Key", config.modalKey);
  headers.set("Modal-Secret", config.modalSecret);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  return { data, status: response.status, headers: response.headers } as T;
}
