"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase";
import type { AvailabilityStatus } from "../../lib/bandportal";

const monthNumbers: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11,
};

function isoFromAgendaButton(button: HTMLButtonElement) {
  const calendar = button.closest(".portal-calendar");
  const section = calendar?.closest(".portal-section");
  const heading = section?.querySelector(".portal-section-head h1")?.textContent?.trim().toLowerCase();
  if (!calendar || !heading) return null;

  const match = heading.match(/^([a-zà-ÿ]+)\s+(\d{4})$/i);
  if (!match) return null;
  const month = monthNumbers[match[1]];
  const year = Number(match[2]);
  if (month === undefined || !Number.isFinite(year)) return null;

  const buttons = Array.from(calendar.querySelectorAll<HTMLButtonElement>("button.portal-day"));
  const index = buttons.indexOf(button);
  if (index < 0) return null;

  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  start.setDate(start.getDate() + index);

  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatChosenDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function AgendaAvailabilityPicker() {
  const [date, setDate] = useState<string | null>(null);
  const [status, setStatus] = useState<Exclude<AvailabilityStatus, "unset">>("available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onAgendaClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".portal-calendar button.portal-day");
      if (!button) return;

      const chosenDate = isoFromAgendaButton(button);
      if (!chosenDate) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setError("");
      setDate(chosenDate);
      setStatus("available");

      void (async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) return;
        const { data } = await supabase
          .from("availability")
          .select("status")
          .eq("user_id", userId)
          .eq("date", chosenDate)
          .maybeSingle();
        if (data?.status === "available" || data?.status === "maybe" || data?.status === "unavailable") {
          setStatus(data.status);
        }
      })();
    };

    document.addEventListener("click", onAgendaClick, true);
    return () => document.removeEventListener("click", onAgendaClick, true);
  }, []);

  async function save(nextStatus: Exclude<AvailabilityStatus, "unset">) {
    if (!date || saving) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setSaving(false);
      setError("Je bent niet meer ingelogd.");
      return;
    }

    const { error: saveError } = await supabase
      .from("availability")
      .upsert({ user_id: userId, date, status: nextStatus, private_note: null }, { onConflict: "user_id,date" });

    if (saveError) {
      setSaving(false);
      setError("Je beschikbaarheid kon niet worden opgeslagen.");
      return;
    }

    setStatus(nextStatus);
    setDate(null);
    setSaving(false);
    window.location.reload();
  }

  if (!date) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Beschikbaarheid instellen"
      onClick={() => !saving && setDate(null)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,.62)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="portal-card"
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(420px, 100%)", padding: 22 }}
      >
        <p className="portal-eyebrow">Mijn beschikbaarheid</p>
        <h2 style={{ marginTop: 4, marginBottom: 6 }}>Kun je deze datum?</h2>
        <p style={{ marginTop: 0, marginBottom: 18, textTransform: "capitalize" }}>{formatChosenDate(date)}</p>

        <div className="portal-form-actions" style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            disabled={saving}
            className={status === "available" ? "portal-primary" : ""}
            onClick={() => void save("available")}
          >
            Ik kan
          </button>
          <button
            type="button"
            disabled={saving}
            className={status === "maybe" ? "portal-primary" : ""}
            onClick={() => void save("maybe")}
          >
            Misschien
          </button>
          <button
            type="button"
            disabled={saving}
            className={status === "unavailable" ? "portal-primary" : ""}
            onClick={() => void save("unavailable")}
          >
            Ik kan niet
          </button>
          <button type="button" disabled={saving} onClick={() => setDate(null)}>Annuleren</button>
        </div>
        {error && <p className="portal-notice portal-notice-error" style={{ marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  );
}
