type RehearsalDate = { id: string; event_id: string | null; rehearsal_date?: string | null };
type EventDate = { id: string; event_date: string };

type DashboardRehearsal = RehearsalDate & { name?: string | null };
type DashboardEvent = EventDate & { event_type?: string; description?: string | null; location?: string | null; start_time?: string | null };
export type NextRehearsal = { id: string; date: string; name: string; location: string | null; startTime: string | null };

export function amsterdamIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function nextFutureRehearsal(rehearsals: DashboardRehearsal[], events: DashboardEvent[], today = amsterdamIsoDate()): NextRehearsal | null {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const linkedEventIds = new Set(rehearsals.map((rehearsal) => rehearsal.event_id).filter(Boolean));
  const candidates: NextRehearsal[] = rehearsals.flatMap((rehearsal) => {
    const event = rehearsal.event_id ? eventById.get(rehearsal.event_id) : null;
    const date = event?.event_date ?? rehearsal.rehearsal_date;
    if (!date) return [];
    return [{ id: rehearsal.id, date, name: rehearsal.name || event?.description || "Repetitie", location: event?.location ?? null, startTime: event?.start_time ?? null }];
  });
  for (const event of events) {
    if (event.event_type !== "rehearsal" || linkedEventIds.has(event.id)) continue;
    candidates.push({ id: event.id, date: event.event_date, name: event.description || "Repetitie", location: event.location ?? null, startTime: event.start_time ?? null });
  }
  return candidates.filter((rehearsal) => rehearsal.date >= today).sort((left, right) => left.date.localeCompare(right.date) || (left.startTime ?? "").localeCompare(right.startTime ?? ""))[0] ?? null;
}

export function sortRehearsalsByDate<T extends RehearsalDate>(rehearsals: T[], events: EventDate[], today: string) {
  const eventDates = new Map(events.map((event) => [event.id, event.event_date]));
  const effectiveDate = (rehearsal: T) => rehearsal.event_id ? eventDates.get(rehearsal.event_id) ?? rehearsal.rehearsal_date ?? null : rehearsal.rehearsal_date ?? null;

  return [...rehearsals].sort((left, right) => {
    const leftDate = effectiveDate(left);
    const rightDate = effectiveDate(right);
    if (!leftDate) return rightDate ? 1 : 0;
    if (!rightDate) return -1;

    const leftIsFuture = leftDate >= today;
    const rightIsFuture = rightDate >= today;
    if (leftIsFuture !== rightIsFuture) return leftIsFuture ? -1 : 1;
    return leftIsFuture ? leftDate.localeCompare(rightDate) : rightDate.localeCompare(leftDate);
  });
}
