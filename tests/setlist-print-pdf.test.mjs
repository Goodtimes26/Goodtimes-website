import assert from "node:assert/strict";
import test from "node:test";
import { createSetlistPrintPdf, openSetlistPrintPdf } from "../app/bandportaal/setlistPrintPdf.ts";

for (const count of [0, 8, 10, 12, 14, 40]) {
  test(`${count} songs, including wrapped titles and notes, fit on one A4`, () => {
    const songs = Array.from({ length: count }, (_, index) => ({
      title: `${index + 1} Intro Sirius + Play That Funky Music`.repeat(index % 3 === 0 ? 3 : 1),
      details: "Zang: Esther & Cindy · Toonsoort: Am · Laatste refrein dubbel",
      seconds: 210,
    }));
    const pdf = createSetlistPrintPdf({ name: "SET 1", date: "10 oktober 2026", songs });
    assert.equal(pdf.getNumberOfPages(), 1);
    assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - 595.28) < 0.1);
    assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - 841.89) < 0.1);
    const commands = pdf.internal.pages[1].join("\n");
    assert.match(commands, /SET 1/);
    assert.match(commands, new RegExp(`${count} nummers`));
    if (count) {
      assert.match(commands, /Zang: Esther & Cindy/);
      assert.match(commands, /Toonsoort: Am/);
      assert.match(commands, new RegExp(`\\(${count}\\.\\) Tj`));
    }
    // PDF text origins must stay inside the page's top and bottom margins.
    for (const [, position] of commands.matchAll(/[\d.]+ ([\d.]+) Td/g)) {
      assert.ok(Number(position) >= 36, `Text below page margin: ${position}`);
      assert.ok(Number(position) <= 806, `Text above page margin: ${position}`);
    }
  });
}

test("the PWA opens a real PDF synchronously during the click", async () => {
  const originalWindow = globalThis.window;
  let url;
  let revoke;
  const viewer = { opener: {} };
  globalThis.window = {
    open(value, target) { url = value; assert.equal(target, "_blank"); return viewer; },
    setTimeout(callback) { revoke = callback; },
  };
  try {
    openSetlistPrintPdf({ name: "SET 2", date: "", songs: [{ title: "Le Freak", details: "Zang: Cindy", seconds: 200 }] });
    assert.ok(url?.startsWith("blob:"));
    assert.equal(viewer.opener, null);
    const response = await fetch(url);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.ok((await response.text()).startsWith("%PDF-"));
  } finally {
    revoke?.();
    globalThis.window = originalWindow;
  }
});
