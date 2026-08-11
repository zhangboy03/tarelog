import assert from "node:assert/strict";
import test from "node:test";
import { resolveProfileSettings, resolveQuickLogItems, resolveTargetMacros, resolveTimeZone } from "../lib/profile.ts";

test("does not ship another person's nutrition targets or quick foods by default", () => {
  assert.deepEqual(resolveProfileSettings({}), {
    timeZone: "UTC",
    targetMacros: null,
    quickLogItems: [],
  });
});

test("accepts a complete, explicit target profile", () => {
  assert.deepEqual(resolveTargetMacros({ TARGET_KCAL: "2400", TARGET_PROTEIN: "150", TARGET_CARBS: "300", TARGET_FAT: "70" }), {
    kcal: 2400,
    protein: 150,
    carbs: 300,
    fat: 70,
  });
  assert.equal(resolveTargetMacros({ TARGET_KCAL: "2400" }), null);
});

test("validates time zones and quick-log nutrition before exposing them", () => {
  assert.equal(resolveTimeZone("America/Los_Angeles"), "America/Los_Angeles");
  assert.equal(resolveTimeZone("not/a-zone"), "UTC");
  assert.deepEqual(resolveQuickLogItems(JSON.stringify([{ name: "酸奶", grams: 200, calories: 120, protein: 8, carbs: 12, fat: 4 }])), [{
    id: "quick-1",
    name: "酸奶",
    mealType: "加餐",
    serving: "200g",
    grams: 200,
    calories: 120,
    protein: 8,
    carbs: 12,
    fat: 4,
    fiber: 0,
    sugar: 0,
    saturatedFat: 0,
    sodium: 0,
    caffeine: 0,
  }]);
  assert.deepEqual(resolveQuickLogItems('[{"name":"坏数据","grams":-1}]'), []);
});
