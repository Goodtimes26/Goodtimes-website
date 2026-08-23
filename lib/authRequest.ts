export const AUTH_REQUEST_TIMEOUT_MS = 15_000;

export class AuthRequestTimeoutError extends Error {
  constructor() {
    super("De authenticatieaanvraag duurde te lang.");
    this.name = "AuthRequestTimeoutError";
  }
}

export async function withAuthTimeout<T>(request: Promise<T>, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthRequestTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isInvalidCredentials(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; status?: unknown; message?: unknown };
  return value.code === "invalid_credentials"
    || value.status === 400 && typeof value.message === "string" && /invalid login credentials/i.test(value.message);
}

export function safeAuthError(error: unknown) {
  if (!(error instanceof Error) && (!error || typeof error !== "object")) return { type: typeof error };
  const value = error as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };
  return {
    name: typeof value.name === "string" ? value.name : "AuthError",
    code: typeof value.code === "string" ? value.code : undefined,
    status: typeof value.status === "number" ? value.status : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
  };
}
