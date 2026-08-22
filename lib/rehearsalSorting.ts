type RehearsalDate = { id: string; event_id: string | null; rehearsal_date?: string | null };
type EventDate = { id: string; event_date: string };

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
