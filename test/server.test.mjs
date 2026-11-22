import test from "node:test";
import assert from "node:assert/strict";
import { validate, demo, startServer, guidance } from "../src/server.mjs";
test("SDK guidance and official demo", () => { assert.ok(guidance.length > 100); validate(demo); });
test("rejects invalid and executable payloads", () => {
  assert.throws(() => validate([{ version: "1.0", createSurface: { surfaceId: "bad", components: [{ id: "root", component: "ExecuteJS", code: "alert(1)" }] } }]));
  assert.throws(() => validate([{ version: "0.8", surfaceUpdate: {} }]));
});
test("transport, isolation, actions, cleanup", async () => {
  const actions = [];
  const s = await startServer(a => { actions.push(a); });
  try {
    s.update(demo); assert.equal(s.snapshot().length, 1);
    assert.throws(() => s.update([{version:"1.0",updateComponents:{surfaceId:"absent",components:[]}}]));
    assert.equal(s.snapshot().length, 1);
    const url = new URL(s.url);
    const page = await fetch(url); assert.equal(page.status,200);
    assert.ok(!(await page.text()).includes("TOKEN"));
    assert.equal((await fetch(url.origin)).status,403);
    const action = new URL("/action"+url.search, url);
    assert.equal((await fetch(action,{method:"POST",body:"{}"})).status,403);
    const response = await fetch(action,{method:"POST",headers:{Origin:url.origin,"Content-Type":"application/json"},body:JSON.stringify({name:"greet",surfaceId:"demo",context:{name:"Ken"}})});
    assert.equal(response.status,204); assert.equal(actions.length,1);
    s.clear(); assert.deepEqual(s.snapshot(),[]);
  } finally { await s.close(); }
});
