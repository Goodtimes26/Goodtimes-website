import test from "node:test";
import assert from "node:assert/strict";
import { isValidYoutubeUrl } from "../lib/youtubeLinks.ts";

test("accepteert gewone en verkorte YouTube-links", () => {
  assert.equal(isValidYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isValidYoutubeUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(isValidYoutubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ"), true);
});

test("weigert niet-YouTube- en ongeldige links", () => {
  assert.equal(isValidYoutubeUrl("https://example.com/video"), false);
  assert.equal(isValidYoutubeUrl("youtube.com/watch?v=test"), false);
  assert.equal(isValidYoutubeUrl(""), false);
});
