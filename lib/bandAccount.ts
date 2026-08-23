import type { SupabaseClient, User } from "@supabase/supabase-js";
import { withAuthTimeout } from "./authRequest";

export type BandAccountCheck =
  | { ok: true; user: User }
  | { ok: false; reason: "session" | "profile" | "role" | "request"; error?: unknown };

export async function validateBandAccount(supabase: SupabaseClient, expectedUserId?: string): Promise<BandAccountCheck> {
  const userResult = await withAuthTimeout(supabase.auth.getUser());
  if (userResult.error || !userResult.data.user || expectedUserId && userResult.data.user.id !== expectedUserId) {
    return { ok: false, reason: "session", error: userResult.error };
  }
  const user = userResult.data.user;
  const [profileResult, roleResult] = await withAuthTimeout(Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]));
  if (profileResult.error || roleResult.error) return { ok: false, reason: "request", error: profileResult.error ?? roleResult.error };
  if (!profileResult.data) return { ok: false, reason: "profile" };
  if (!roleResult.data) return { ok: false, reason: "role" };
  return { ok: true, user };
}
