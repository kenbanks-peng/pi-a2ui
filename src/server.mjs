import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { MessageProcessor } from "@a2ui/web_core";
import { basicCatalog } from "@a2ui/web_core/catalogs/basic/v1";
import { A2uiGenerator, CatalogConfig, InMemoryCatalogProvider, validatePayload } from "@a2ui/agent";

export const catalog = basicCatalog.toJson();
export const catalogId = basicCatalog.id;
const agentCatalog = new InMemoryCatalogProvider(catalog).load();
export const guidance = new A2uiGenerator([new CatalogConfig(agentCatalog)]).createProcessor({ supportedCatalogIds: [catalogId] }).promptSnippet;
export const demo = [{ version: "1.0", createSurface: {
  surfaceId: "demo", catalogId,
  components: [
    { id: "root", component: "Column", children: ["title", "name", "submit"] },
    { id: "title", component: "Text", text: "Hello from pi · A2UI" },
    { id: "name", component: "TextField", label: "Your name", value: { "@path": "/name" } },
    { id: "submit", component: "Button", child: "label", action: { event: { name: "greet", context: { name: { "@path": "/name" } } } } },
    { id: "label", component: "Text", text: "Send to pi" },
  ], dataModel: { name: "" },
} }];

export function validate(messages) {
  if (!Array.isArray(messages)) throw Error("messages must be an array");
  if (JSON.stringify(messages).length > 2_000_000) throw Error("Session UI limit: 2 MB. Clear the UI first.");
  for (const m of messages) {
    if (m.version !== "1.0" || !["createSurface", "updateComponents", "updateDataModel", "deleteSurface"].some(k => m[k]))
      throw Error("Only A2UI 1.0 surface/component/data messages are allowed");
    // Disallow prototype keys even inside data bindings.
    if (/"(?:__proto__|prototype|constructor)"\s*:/.test(JSON.stringify(m))) throw Error("Unsafe property name");
  }
  validatePayload([agentCatalog], messages);
}

/** @param {(action: Record<string, unknown>) => void | Promise<void>} onAction */
export async function startServer(onAction = () => {}) {
  let history = [];
  const token = randomBytes(24).toString("hex");
  const clients = new Set();
  const [page, script] = await Promise.all([
    readFile(new URL("./view.html", import.meta.url)), readFile(new URL("../dist/client.js", import.meta.url)),
  ]);
  const send = (res, messages, reset) => res.write("data: " + JSON.stringify({ messages, reset }) + "\n\n");
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.searchParams.get("token") !== token) { res.writeHead(403).end(); return; }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      if (req.method === "GET" && url.pathname === "/") {
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src https: data:; media-src https:; font-src https: data:; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
        res.end(page.toString().replace("TOKEN", token));
      } else if (req.method === "GET" && url.pathname === "/client.js") {
        res.setHeader("Content-Type", "text/javascript"); res.end(script);
      } else if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        clients.add(res); send(res, history, true);
        req.on("close", () => clients.delete(res));
      } else if (req.method === "POST" && url.pathname === "/action") {
        if (req.headers.origin !== "http://" + req.headers.host || req.headers["content-type"] !== "application/json") { res.writeHead(403).end(); return; }
        let body = "";
        for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413).end(); return; } }
        const action = JSON.parse(body);
        if (typeof action.name !== "string" || typeof action.surfaceId !== "string") { res.writeHead(400).end(); return; }
        await onAction(action);
        res.writeHead(204).end();
      } else res.writeHead(404).end();
    } catch { if (!res.headersSent) res.writeHead(400); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  server.unref();
  return {
    url: "http://127.0.0.1:" + server.address().port + "/?token=" + token,
    update(messages) { validate([...history, ...messages]); history.push(...structuredClone(messages)); for (const c of clients) send(c, messages, false); },
    clear() { history = []; for (const c of clients) send(c, [], true); },
    snapshot() { return structuredClone(history); },
    async close() { for (const c of clients) c.end(); clients.clear(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
