export type DashboardActivity = {
  id: string;
  entityKey: string;
  kind: "message" | "setlist" | "rehearsal" | "performance" | "file" | "song";
  detail: string;
  updatedAt: string;
  actorId: string | null;
  isNew: boolean;
  changes?: string[];
};

type SetlistIdentity = {
  id: string;
  name: string;
  eventId: string | null;
  setlistDate: string | null;
  sourceSystem: string | null;
  sourceId: string | null;
};

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
}

export function setlistActivityKey(setlist: SetlistIdentity) {
  if (setlist.sourceSystem && setlist.sourceId) {
    return `setlist-source:${setlist.sourceSystem}:${setlist.sourceId}`;
  }

  // Een eerder opnieuw aangemaakte setlist met dezelfde naam, datum en
  // activiteit geldt voor het dashboard als dezelfde logische setlist.
  // De echte database-id blijft elders leidend voor bewerken en verwijderen.
  return `setlist:${normalizedName(setlist.name)}:${setlist.eventId ?? ""}:${setlist.setlistDate ?? ""}`;
}

export function activityAgeInDays(value: string, now = new Date()) {
  const changed = new Date(value);
  if (Number.isNaN(changed.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const changedDay = new Date(changed.getFullYear(), changed.getMonth(), changed.getDate()).getTime();
  return Math.max(0, Math.round((today - changedDay) / 86_400_000));
}

export function deduplicateDashboardActivities(
  candidates: DashboardActivity[],
  now = new Date(),
  maximumAgeInDays = 14,
  limit = 4,
) {
  const newestFirst = [...candidates].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const unique = new Map<string, DashboardActivity>();

  for (const activity of newestFirst) {
    const age = activityAgeInDays(activity.updatedAt, now);
    if (age === null || age > maximumAgeInDays) continue;
    const existing = unique.get(activity.entityKey);
    if (existing) {
      // Komt dezelfde logische setlist meer dan één keer voor, dan bestond hij
      // al en is de nieuwste gebeurtenis dus een wijziging, geen nieuwe setlist.
      if (existing.kind === "setlist") unique.set(activity.entityKey, { ...existing, isNew: false });
      continue;
    }
    unique.set(activity.entityKey, activity);
  }

  return [...unique.values()].slice(0, limit);
}
