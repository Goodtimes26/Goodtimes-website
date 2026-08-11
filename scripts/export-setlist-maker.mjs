import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourceUrl = "https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site/api/state";
const outputPath = resolve(process.argv[2] || "tmp/setlist-maker-state.json");

const response = await fetch(sourceUrl, { headers: { accept: "application/json" } });
if (!response.ok) throw new Error(`Setlist Maker gaf HTTP ${response.status}`);
const payload = await response.json();
if (!Array.isArray(payload?.state?.songs)) throw new Error("De bron bevat geen geldige songs-array.");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Export opgeslagen: ${outputPath} (${payload.state.songs.length} nummers)`);

