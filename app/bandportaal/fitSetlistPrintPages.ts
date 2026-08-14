const A4_PRINTABLE_HEIGHT_MM = 275;
const PRINT_SAFETY_MARGIN_MM = 2;

function millimetresToPrintPixels(millimetres: number) {
  // Paged-media layout uses PDF points (72 per inch), while DOM measurements
  // are otherwise reported in screen CSS pixels. Converting explicitly keeps
  // the fitting calculation aligned with the physical A4 page.
  return millimetres * 72 / 25.4;
}

export function clearSetlistPrintScales(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".portal-setlist-list .portal-data-card").forEach((card) => {
    card.style.removeProperty("--portal-print-scale");
    delete card.dataset.printScale;
  });
}

export function fitSetlistsToSinglePages(root: ParentNode = document) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".portal-setlist-list .portal-data-card"));
  if (!cards.length) return;

  const maximumHeight = millimetresToPrintPixels(A4_PRINTABLE_HEIGHT_MM - PRINT_SAFETY_MARGIN_MM);

  cards.forEach((card) => card.style.setProperty("--portal-print-scale", "1"));

  // Force one layout pass after resetting previous print scales.
  void document.documentElement.offsetHeight;

  cards.forEach((card) => {
    const naturalHeight = card.getBoundingClientRect().height;
    const scale = naturalHeight > maximumHeight ? maximumHeight / naturalHeight : 1;
    const safeScale = Math.max(0.1, Math.min(1, scale));

    card.style.setProperty("--portal-print-scale", safeScale.toFixed(4));
    card.dataset.printScale = safeScale.toFixed(4);
  });
}
