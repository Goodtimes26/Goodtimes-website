"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase";
import type { AvailabilityStatus } from "../../lib/bandportal";

const monthNumbers: Record<string, number> = { januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5, juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11 };

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
  const chosen = new Date(first);
  chosen.setDate(first.getDate() - ((first.getDay() + 6) % 7) + index);
  return `${chosen.getFullYear()}-${String(chosen.getMonth() + 1).padStart(2, "0")}-${String(chosen.getDate()).padStart(2, "0")}`;
}

function markSelectedAgendaDays(selectedDates: Set<string>) {
  document.querySelectorAll<HTMLButtonElement>(".portal-calendar button.portal-day").forEach((button) => {
    const date = isoFromAgendaButton(button);
    const selected = date !== null && selectedDates.has(date);
    button.classList.toggle("portal-day-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function AgendaAvailabilityPicker() {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onAgendaClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(".portal-calendar button.portal-day");
      if (!button) return;
      const chosenDate = isoFromAgendaButton(button);
      if (!chosenDate) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setError("");
      setSelectedDates((current) => current.includes(chosenDate) ? current.filter((date) => date !== chosenDate) : [...current, chosenDate].sort());
    };
    document.addEventListener("click", onAgendaClick, true);
    return () => document.removeEventListener("click", onAgendaClick, true);
  }, []);

  useEffect(() => {
    const selected = new Set(selectedDates);
    markSelectedAgendaDays(selected);
    // De kalenderknoppen worden vervangen wanneer de gebruiker van maand wisselt.
    const observer = new MutationObserver(() => markSelectedAgendaDays(selected));
    const content = document.querySelector(".portal-content");
    if (content) observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selectedDates]);

  async function saveSelectedDates(status: Exclude<AvailabilityStatus, "unset">) {
    if (selectedDates.length === 0 || saving) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Je beschikbaarheid kon niet worden opgeslagen."); return; }
    setSaving(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); setError("Je bent niet meer ingelogd."); return; }
    const rows = selectedDates.map((date) => ({ user_id: userId, date, status, private_note: null }));
    const { error: saveError } = await supabase.from("availability").upsert(rows, { onConflict: "user_id,date" });
    if (saveError) { setSaving(false); setError("Je beschikbaarheid kon niet worden opgeslagen. Probeer het opnieuw."); return; }
    setSelectedDates([]);
    setSaving(false);
    window.location.reload();
  }

  async function removeSelectedDates() {
    if (selectedDates.length === 0 || saving) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Je beschikbaarheid kon niet worden verwijderd."); return; }
    setSaving(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); setError("Je bent niet meer ingelogd."); return; }
    const { error: deleteError } = await supabase.from("availability").delete().eq("user_id", userId).in("date", selectedDates);
    if (deleteError) { setSaving(false); setError("De gekozen status kon niet worden verwijderd. Probeer het opnieuw."); return; }
    setSelectedDates([]);
    setSaving(false);
    window.location.reload();
  }

  if (selectedDates.length === 0 && !error) return null;
  return (
    <aside className="portal-availability-selection" aria-live="polite">
      <div className="portal-availability-selection-inner">
        <div><strong>{selectedDates.length} {selectedDates.length === 1 ? "datum" : "datums"} geselecteerd</strong><span>Tik opnieuw op een datum om deze te verwijderen.</span></div>
        <div className="portal-availability-selection-actions">
          <button type="button" className="portal-availability-status is-available" disabled={saving} onClick={() => void saveSelectedDates("available")}>Beschikbaar</button>
          <button type="button" className="portal-availability-status is-maybe" disabled={saving} onClick={() => void saveSelectedDates("maybe")}>Misschien</button>
          <button type="button" className="portal-availability-status is-unavailable" disabled={saving} onClick={() => void saveSelectedDates("unavailable")}>Niet beschikbaar</button>
          <button type="button" className="portal-availability-remove" disabled={saving} onClick={() => void removeSelectedDates()}>Status verwijderen</button>
          <button type="button" disabled={saving} onClick={() => { setSelectedDates([]); setError(""); }}>Selectie wissen</button>
        </div>
        {saving && <p className="portal-availability-saving" role="status">Wijziging opslaan…</p>}
        {error && <p className="portal-notice portal-notice-error" role="alert">{error}</p>}
      </div>
    </aside>
  );
}
