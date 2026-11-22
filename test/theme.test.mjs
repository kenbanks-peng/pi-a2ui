import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../src/server.mjs";

test("viewer serves host-owned Mocha theme and accessible responsive shell", async () => {
  const server = await startServer();
  try {
    const response = await fetch(server.url);
    const html = await response.text();
    assert.match(html, /lang="en" class="a2ui-dark"/);
    assert.match(html, /--mocha-base: #1e1e2e/);
    assert.match(html, /--mocha-text: #cdd6f4/);
    assert.match(html, /--mocha-mauve: #cba6f7/);
    assert.match(html, /--a2ui-color-primary: var\(--mocha-mauve\)/);
    assert.match(html, /:focus-visible/);
    assert.match(html, /prefers-reduced-motion/);
    assert.match(html, /a2ui-basic-row \{ flex-wrap: wrap/);
    assert.match(html, /role="status" aria-live="polite"/);
    assert.ok(!html.includes("TOKEN"));
  } finally {
    await server.close();
  }
});
