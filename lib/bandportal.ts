export type UserRole = "admin" | "member";
export type AvailabilityStatus = "available" | "unavailable" | "maybe" | "unset";
export type RequestStatus =
  | "new"
  | "pending"
  | "available"
  | "unavailable"
  | "option"
  | "confirmed"
  | "cancelled";
export type ResponseStatus = "yes" | "no" | "tentative";
export type EventType = "rehearsal" | "performance" | "meeting" | "photoshoot" | "other";

export type Profile = {
  id: string;
  display_name: string;
  email: string | null;
};

export type Availability = {
  id: string;
  user_id: string;
  date: string;
  status: Exclude<AvailabilityStatus, "unset">;
  private_note: string | null;
};

export type BookingRequest = {
  id: string;
  event_date: string;
  event_name: string;
  location: string | null;
  city: string | null;
  performance_type: string | null;
  start_time: string | null;
  end_time: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  offered_fee: string | null;
  response_deadline: string | null;
  notes: string | null;
  status: RequestStatus;
  created_at: string;
};

export type RequestResponse = {
  id: string;
  request_id: string;
  user_id: string;
  status: ResponseStatus;
  note: string | null;
};

export type BandEvent = {
  id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string;
  notes: string | null;
  event_type: EventType;
};

export type PageView = {
  id: number;
  path: string;
  visit_id: string;
  viewed_at: string;
};

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: "Beschikbaar",
  unavailable: "Niet beschikbaar",
  maybe: "Misschien",
  unset: "Nog niet ingevuld",
};

export const requestLabels: Record<RequestStatus, string> = {
  new: "Nieuw",
  pending: "In afwachting",
  available: "Beschikbaar",
  unavailable: "Niet beschikbaar",
  option: "Optie",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
};

export const responseLabels: Record<ResponseStatus, string> = {
  yes: "Ja, beschikbaar",
  no: "Nee, niet beschikbaar",
  tentative: "Onder voorbehoud",
};

export const eventLabels: Record<EventType, string> = {
  rehearsal: "Repetitie",
  performance: "Optreden",
  meeting: "Vergadering",
  photoshoot: "Fotoshoot",
  other: "Overige bandactiviteit",
};

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
