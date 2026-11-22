import { MessageProcessor } from "@a2ui/web_core";
import { basicCatalog } from "@a2ui/web_core/catalogs/basic/v1";
import { A2uiSurface } from "@a2ui/lit";
if (!customElements.get("a2ui-surface")) customElements.define("a2ui-surface", A2uiSurface);
const token = new URLSearchParams(location.search).get("token");
const endpoint = p => p + "?token=" + token;
const app = document.querySelector("#app"), status = document.querySelector("#status");
let processor;
function reset() {
  processor?.dispose(); app.replaceChildren();
  processor = new MessageProcessor([basicCatalog], async action => {
    try {
      const r = await fetch(endpoint("/action"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      if (!r.ok) throw Error("Action rejected");
      status.textContent = "Sent to pi";
    } catch (e) { status.textContent = e.message; }
  }, { version: "v1.0" });
  processor.onSurfaceCreated(surface => {
    const el = document.createElement("a2ui-surface"); el.surface = surface; el.dataset.id = surface.id; app.append(el);
  });
  processor.onSurfaceDeleted(id => { for (const el of app.children) if (el.dataset.id === id) el.remove(); });
}
reset();
const events = new EventSource(endpoint("/events"));
events.onmessage = e => {
  try { const update = JSON.parse(e.data); if (update.reset) reset(); processor.processMessages(update.messages); status.textContent = "Live"; }
  catch(e) { status.textContent = e.message; }
};
events.onerror = () => status.textContent = "Disconnected · retrying…";
