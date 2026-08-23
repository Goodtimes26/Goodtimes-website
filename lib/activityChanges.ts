type ActivityChangeRow = {
  action: "created" | "updated";
  title: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown>;
};

const fieldLabels: Record<string, string> = {
  event_date: "datum", start_time: "aanvangstijd", end_time: "eindtijd",
  location: "locatie", description: "omschrijving", is_public: "zichtbaarheid",
  title: "titel", name: "naam", setlist_date: "datum", status: "status",
  general_notes: "opmerkingen", notes: "notities", youtube_url: "YouTube-link",
  artist: "artiest", vocalist: "zanger/zangeres", musical_key: "toonsoort",
  bpm: "BPM", external_url: "link",
};

const compactFields: Record<string, string> = {
  youtube_url: "YouTube-link bijgewerkt",
  external_url: "Link bijgewerkt",
  description: "Omschrijving bijgewerkt",
  notes: "Notities bijgewerkt",
  general_notes: "Opmerkingen bijgewerkt",
};

const ignoredFields = new Set(["id", "created_at", "updated_at", "created_by", "updated_by", "author_id", "uploaded_by", "version"]);
const looksTechnicalOrLong = (value: unknown) => {
  const text = String(value ?? "");
  return /^https?:\/\//i.test(text) || text.length > 60;
};

export function formatActivityChanges(row: ActivityChangeRow) {
  if (row.action === "created") return [`Toegevoegd: ${row.title}`];
  return Object.keys(row.new_data)
    .filter((key) => !ignoredFields.has(key) && !key.endsWith("_id") && JSON.stringify(row.old_data?.[key] ?? null) !== JSON.stringify(row.new_data[key] ?? null))
    .slice(0, 3)
    .map((key) => {
      if (compactFields[key]) return compactFields[key];
      const label = fieldLabels[key] ?? key.replaceAll("_", " ");
      const beforeValue = row.old_data?.[key] ?? null;
      const afterValue = row.new_data[key] ?? null;
      if (looksTechnicalOrLong(beforeValue) || looksTechnicalOrLong(afterValue)) {
        return `${label.charAt(0).toUpperCase()}${label.slice(1)} bijgewerkt`;
      }
      const before = String(beforeValue ?? "niet ingevuld").replace(/:00$/, "");
      const after = String(afterValue ?? "niet ingevuld").replace(/:00$/, "");
      return `Gewijzigd: ${label} van ${before} naar ${after}${key.includes("time") ? " uur" : ""}`;
    });
}
