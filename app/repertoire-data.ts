export type RepertoireSong = {
  category: "Dance Classics" | "Nederpop";
  title: string;
  artist: string;
};

/*
 * CSV-koppeling:
 * gebruik later de kolommen category,title,artist en vervang alleen deze array
 * door de ingelezen CSV-rijen. De Repertoire-pagina hoeft dan niet te wijzigen.
 */
export const repertoireSongs: RepertoireSong[] = [
  { category: "Dance Classics", title: "September", artist: "Earth, Wind & Fire" },
  { category: "Dance Classics", title: "I’m So Excited", artist: "The Pointer Sisters" },
  { category: "Dance Classics", title: "You Spin Me Round", artist: "Dead or Alive" },
  { category: "Dance Classics", title: "Maniac", artist: "Michael Sembello" },
  { category: "Dance Classics", title: "Venus", artist: "Bananarama" },
  { category: "Nederpop", title: "België", artist: "Het Goede Doel" },
  { category: "Nederpop", title: "Even Aan Mijn Moeder Vragen", artist: "Bloem" },
  { category: "Nederpop", title: "Iedereen Is Van De Wereld", artist: "The Scene" },
  { category: "Nederpop", title: "Dansen Op De Vulkaan", artist: "De Dijk" },
  { category: "Nederpop", title: "Zwart Wit", artist: "Frank Boeijen Groep" },
];

export const repertoireCategories = (["Dance Classics", "Nederpop"] as const).map((name) => ({
  name,
  songs: repertoireSongs.filter((song) => song.category === name),
}));
