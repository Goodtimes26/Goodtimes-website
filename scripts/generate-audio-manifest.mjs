import { readdir, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";

const audioDirectory = join(process.cwd(), "public", "audio");
const files = (await readdir(audioDirectory))
  .filter((file) => extname(file).toLowerCase() === ".mp3")
  .sort((a, b) => a.localeCompare(b, "nl", { sensitivity: "base" }));

const tracks = files.map((file) => ({
  title: parse(file).name,
  src: `/audio/${encodeURIComponent(file)}`,
}));

await writeFile(join(audioDirectory, "tracks.json"), `${JSON.stringify(tracks, null, 2)}\n`);
