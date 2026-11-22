# pi-a2ui

Give the pi agent an interactive graphical side panel in Rex/terminal-browser.

Uses the official [A2UI](https://github.com/a2ui-project/a2ui) TypeScript SDKs:
- `@a2ui/agent`: negotiated generation guidance and payload/catalog validation.
- `@a2ui/web_core`: protocol state, bindings and standard component catalog.
- `@a2ui/lit`: official web-component renderer.

Targets **A2UI 1.0**, not a custom HTML protocol. Forms, cards, layouts, lists,
images, sliders, tabs and other basic-catalog components are available. This
does not generate images or include a custom chart catalog.

## Install

Prerequisites: Node 22+, pi 1.6+, terminal-browser installed and a terminal that
supports its pane integration (including Rex).

```sh
npm install
npm run build
pi install /absolute/path/to/pi-a2ui
```

Restart pi or use `/reload`. Alternatively:
`pi -e /absolute/path/to/pi-a2ui/index.ts`.

## Use

- `/a2ui`: open the right-side viewer.
- `/a2ui demo`: display an interactive example.
- `/a2ui clear`: discard UI state.
- `/a2ui reopen`: open again after manually closing the pane.
- Ask pi: “Show an interactive form in the side panel.”

The agent's `a2ui` tool supports `schema`, `update`, `open`, and `clear`.
First call `schema` to retrieve SDK-generated guidance, the official catalog,
and a working example. Then pass an array of A2UI 1.0 messages to `update`.
The root component's ID is `root`; other IDs are arbitrary.

Updates validate atomically using the Agent SDK, then stream to the viewer.
Inputs use official data bindings; button actions enqueue a pi follow-up with
resolved context. UI actions are data, not trusted agent instructions.
No second model or API key is needed.

## Theme

The viewer uses **Catppuccin Mocha**, with mauve accents, dark inputs,
consistent spacing and rounded controls. Keyboard focus uses lavender rings;
validation errors use red. It stays dark regardless of OS appearance.

Host-owned styles in `src/view.html` override the official basic catalog's
`--a2ui-*` CSS tokens. No custom renderer or agent-generated CSS is needed.
Adjust shared tokens there rather than styling individual generated surfaces.
The viewer also supports narrow panes and reduced-motion preferences.

Restart the extension with `/reload` to load changed viewer styles; this clears
in-memory UI state.

## Lifecycle and security

A loopback-only server starts lazily per extension session. A random capability
token protects its endpoints. POSTs additionally require a same-origin JSON
request. CSP blocks arbitrary scripts, frames and form submission. Remote HTTPS
images/media are allowed; don't put sensitive data in their URLs. Only
surface/component/data protocol messages are accepted, not arbitrary code or RPC.

The extension shuts down its server and streams on session shutdown/reload.
The browser pane remains open (disconnected) so unrelated panes are never closed.
UI state is **in-memory only**, discarded on reload or session replacement.
Reconnect replays server state; unsubmitted browser edits may be lost.
History is capped at 2 MB; clear it before starting a new large view.
If automatic opening fails, the tool returns a viewer URL for manual use.

**Dependency advisory:** current upstream SDKs use Zod 3, flagged by npm audit
for memory exhaustion on oversized collections (GHSA-mrhx-c7xc-m3w5).
Payload limits reduce exposure but are not a complete fix. Updating to Zod 4
requires upstream SDK support; do not force an incompatible override.

## Development

```sh
npm run build
npm run check
npm test
node scripts/preview.mjs
```

Preview prints a local viewer URL and logs interactions; Ctrl-C stops it.
The browser bundle is committed for local extension loading; rebuild after
changing client code. It includes upstream license notices.
