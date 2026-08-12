import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps Apple Health synchronization private, incremental, and acknowledged per nutrient", async () => {
  const [route, schema, shortcut, helper] = await Promise.all([
    readFile(new URL("../app/api/health-sync/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/apple-health-shortcut.swift", import.meta.url), "utf8"),
    import("../lib/health-sync.ts"),
  ]);

  assert.match(route, /HEALTH_SYNC_TOKEN/);
  assert.match(route, /token\.length < 24 \|\| token\.startsWith\("replace-with-"\)/);
  assert.match(route, /x-health-sync-token/);
  assert.doesNotMatch(route, /searchParams\.get\("token"\)/);
  assert.match(route, /pendingHealthNutrients/);
  assert.match(route, /eq\(mealLogs\.mealDate, today\)/);
  assert.match(route, /onConflictDoNothing/);
  assert.match(route, /body\.action === "reset-today"/);
  assert.match(route, /db\.delete\(healthSyncs\)\.where\(eq\(healthSyncs\.mealDate, today\)\)/);
  assert.match(schema, /healthSyncs/);
  assert.match(schema, /mealLogId: text\("meal_log_id"\)\.primaryKey\(\)/);
  assert.match(shortcut, /GetContentsOfURL/);
  assert.match(shortcut, /X-Health-Sync-Token/);
  assert.doesNotMatch(shortcut, /URLQueryItem\(name: "token"/);
  assert.match(shortcut, /syncNutrient/);
  assert.match(shortcut, /method: \.POST/);
  assert.match(shortcut, /"nutrient": \.string\(Text\(key\)\)/);
  assert.match(shortcut, /没有新增时不会重复写入/);
  assert.doesNotMatch(shortcut, /If\(/);

  const rows = [{ id: "meal-1", calories: 500, protein: 0, carbs: 60, fat: 10, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 300, caffeine: 0 }];
  const pending = helper.pendingHealthNutrients(rows, new Set(["meal-1:carbs"]));
  assert.deepEqual(pending.calories.map(({ id }) => id), ["meal-1"]);
  assert.deepEqual(pending.carbs, []);
  assert.deepEqual(pending.protein, []);
  assert.deepEqual(pending.caffeine, []);
});
