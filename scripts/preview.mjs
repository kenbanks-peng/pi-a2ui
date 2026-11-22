import { startServer, demo } from "../src/server.mjs";
const server = await startServer(action => console.log("Action:", JSON.stringify(action)));
server.update(demo);
console.log(server.url);
const keepalive = setInterval(() => {}, 1000);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { clearInterval(keepalive); await server.close(); });
