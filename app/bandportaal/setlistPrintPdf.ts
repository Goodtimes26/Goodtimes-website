import { jsPDF } from "jspdf";

export type PrintableSetlist = {
  name: string;
  date: string;
  songs: { title: string; details: string; seconds: number }[];
};

const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** A self-contained A4 document, independent of the PWA's print-dialog support. */
export function createSetlistPrintPdf(setlist: PrintableSetlist) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const margin = 36;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const height = pdf.internal.pageSize.getHeight() - margin * 2;
  const baseFont = setlist.songs.length <= 10 ? 20 : 17;

  const measure = (scale: number) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(26 * scale);
    const heading = pdf.splitTextToSize(setlist.name, width) as string[];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11 * scale);
    const summary = pdf.splitTextToSize(`${setlist.date} | ${setlist.songs.length} nummers | ${duration(setlist.songs.reduce((sum, song) => sum + song.seconds, 0))} totale speelduur`, width) as string[];
    const rows = setlist.songs.map((song) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(baseFont * scale);
      const title = pdf.splitTextToSize(song.title, width - 30 * scale) as string[];
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10 * scale);
      const details = song.details ? pdf.splitTextToSize(song.details, width - 30 * scale) as string[] : [];
      return { title, details, height: (title.length * baseFont * 1.18 + details.length * 12 + 14) * scale };
    });
    const headerHeight = (heading.length * 31 + summary.length * 14 + 24) * scale;
    return { heading, summary, rows, headerHeight, totalHeight: headerHeight + rows.reduce((sum, row) => sum + row.height, 0) };
  };

  let scale = 1;
  let layout = measure(scale);
  while (layout.totalHeight > height && scale > 0.01) {
    scale *= Math.min(0.95, height / layout.totalHeight * 0.98);
    layout = measure(scale);
  }
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26 * scale);
  pdf.text(layout.heading, margin, y, { baseline: "top", lineHeightFactor: 31 / 26 });
  y += (layout.heading.length * 31 + 6) * scale;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11 * scale);
  pdf.text(layout.summary, margin, y, { baseline: "top", lineHeightFactor: 14 / 11 });
  y = margin + layout.headerHeight;
  const rowSpacing = layout.rows.length ? Math.min(12, (height - layout.totalHeight) / layout.rows.length) : 0;
  layout.rows.forEach((row, index) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(baseFont * scale);
    pdf.text(`${index + 1}.`, margin, y, { baseline: "top" });
    pdf.text(row.title, margin + 30 * scale, y, { baseline: "top", lineHeightFactor: 1.18 });
    if (row.details.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10 * scale);
      pdf.text(row.details, margin + 30 * scale, y + row.title.length * baseFont * 1.18 * scale, { baseline: "top", lineHeightFactor: 1.2 });
    }
    y += row.height + rowSpacing;
  });
  pdf.setProperties({ title: `GoodTimes — ${setlist.name}`, author: "GoodTimes" });
  return pdf;
}

export function openSetlistPrintPdf(setlist: PrintableSetlist) {
  // Keep this synchronous inside the click: iOS blocks windows opened after an await.
  const pdf = createSetlistPrintPdf(setlist);
  const url = URL.createObjectURL(pdf.output("blob"));
  const viewer = window.open(url, "_blank");
  if (viewer) viewer.opener = null;
  else pdf.save(`GoodTimes-${setlist.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "setlijst"}.pdf`);
  // Do not revoke on unmount; the separate PDF viewer may still be loading.
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
}
