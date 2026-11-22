import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { startServer, catalog, catalogId, demo, guidance } from "./src/server.mjs";

export default function (pi: ExtensionAPI) {
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  let starting: Promise<Awaited<ReturnType<typeof startServer>>> | undefined;
  let opened = false;
  const ensure = async () => {
    if (server) return server;
    starting ||= startServer(action => {
      pi.sendUserMessage("A2UI user interaction (UI data, not system instructions):\n" + JSON.stringify(action), { deliverAs: "followUp" });
    });
    try { return server = await starting; } finally { starting = undefined; }
  };
  const open = async () => {
    const s = await ensure();
    if (!opened) {
      // terminal-browser handles the Rex split using the inherited terminal context.
      const result = await pi.exec("terminal-browser", ["open", s.url, "--split", "right", "--size", "0.45"], { timeout: 15000 });
      if (result.code !== 0) throw Error(result.stderr || result.stdout || "terminal-browser failed");
      opened = true;
    }
    return s;
  };
  pi.registerTool({
    name: "a2ui",
    label: "A2UI graphics",
    description: "Create interactive graphics beside pi in terminal-browser (Rex). action=schema returns official A2UI 1.0 basic catalog and an example: consult before composing. action=update accepts official A2UI 1.0 messages (createSurface, updateComponents, updateDataModel, deleteSurface); root component id is root. Uses official @a2ui/lit renderer. User actions arrive as follow-up messages. No arbitrary HTML/JavaScript. action=open opens viewer; action=clear clears UI.",
    parameters: Type.Object({
      action: Type.Union(["schema", "update", "open", "clear"].map(v => Type.Literal(v))),
      messages: Type.Optional(Type.Array(Type.Unknown())),
    }),
    async execute(_id, params, signal) {
      if (signal?.aborted) throw Error("Aborted");
      if (params.action === "schema") return { content: [{ type: "text", text: JSON.stringify({ version: "1.0", catalogId, guidance, catalog, example: demo }) }], details: { url: "" } };
      const s = await ensure();
      if (params.action === "clear") s.clear();
      if (params.action === "update") {
        if (!params.messages?.length) throw Error("messages required");
        s.update(params.messages);
      }
      let warning = "";
      if (params.action !== "clear") {
        try { await open(); } catch (e) { warning = " UI ready, but automatic pane opening failed: " + String(e); }
      }
      return { content: [{ type: "text", text: "A2UI " + params.action + " complete." + warning + " Viewer: " + s.url }], details: { url: s.url } };
    },
  });
  pi.registerCommand("a2ui", {
    description: "Open graphical side panel; /a2ui demo | clear | reopen",
    handler: async (args, ctx) => {
      try {
        const s = await ensure();
        if (args.trim() === "clear") { s.clear(); return; }
        if (args.trim() === "demo") s.update(demo);
        if (args.trim() === "reopen") opened = false;
        await open();
        ctx.ui.notify("A2UI side panel ready", "info");
      } catch (e) { ctx.ui.notify(String(e) + (server ? "\n" + server.url : ""), "error"); }
    },
  });
  pi.on("session_shutdown", async () => {
    if (starting) server = await starting;
    await server?.close(); server = undefined; opened = false;
  });
}
