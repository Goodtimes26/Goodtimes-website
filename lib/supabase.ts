import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
const NETWORK_TIMEOUT_MS = 12_000;

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  // Alleen Auth begrenzen. Grote audio-/videouploads en overige Band-app-data
  // mogen niet door de korte inlog-time-out worden afgebroken.
  if (!requestUrl.includes("/auth/v1/")) return fetch(input, init);
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) abortFromUpstream();
  else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Netwerkaanvraag duurde te lang", "TimeoutError")), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
};

function authStoragePrefix() {
  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "";
  }
}

export function clearStoredSupabaseSession() {
  if (typeof window === "undefined") return;
  const prefix = authStoragePrefix();
  if (prefix) {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  }
  browserClient = null;
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { fetch: fetchWithTimeout },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return browserClient;
}
