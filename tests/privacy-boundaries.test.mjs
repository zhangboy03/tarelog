import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("release migrations never rewrite or delete a person's journal history", async () => {
  const directory = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql"));
  const migrations = await Promise.all(files.map((file) => readFile(new URL(file, directory), "utf8")));
  const sql = migrations.join("\n");
  assert.doesNotMatch(sql, /\bUPDATE\s+[`\"]?(analyses|meal_logs)[`\"]?/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\s+[`\"]?(analyses|meal_logs)[`\"]?/i);
});

test("the public client gets quick foods from deployment configuration", async () => {
  const client = await readFile(new URL("../app/KitchenApp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /const quickLogItems\s*=/);
  assert.match(client, /data\.quickLogItems/);
});

test("unconfirmed photo and manual readings are not persisted", async () => {
  const [photoRoute, manualRoute, kitchenRoute] = await Promise.all([
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/manual-entry/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/kitchen/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(photoRoute, /insert\(analyses\)|MEDIA\.put/);
  assert.doesNotMatch(manualRoute, /insert\(analyses\)/);
  assert.match(kitchenRoute, /action === "saveAnalysis"/);
  assert.match(kitchenRoute, /insert\(analyses\)/);
});

test("private journal reads are not cacheable and meal creation is retry-safe", async () => {
  const [route, client] = await Promise.all([
    readFile(new URL("../app/api/kitchen/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/KitchenApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.match(route, /const id = String\(body\.id \|\| crypto\.randomUUID\(\)\)/);
  assert.match(route, /db\.insert\(mealLogs\)[\s\S]*?\.onConflictDoNothing\(\)/);
  assert.match(route, /Response\.json\(\{ ok: true, id \}/);
  assert.match(client, /quickRequestIds/);
  assert.match(client, /id: requestId/);
  assert.match(client, /相同记录不会重复写入/);
});
