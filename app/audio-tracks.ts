type AudioModule = Record<string, string>;

// Nieuwe mp3-bestanden in app/audio worden bij de volgende publicatie automatisch toegevoegd.
const audioFiles = import.meta.glob("./audio/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
}) as AudioModule;

export const audioTracks = Object.entries(audioFiles)
  .map(([path, src]) => ({
    src,
    title: decodeURIComponent(path.split("/").pop() ?? path).replace(/\.mp3$/i, ""),
  }))
  .sort((a, b) => a.title.localeCompare(b.title, "nl", { sensitivity: "base" }));
