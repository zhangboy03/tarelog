import assert from "node:assert/strict";
import test from "node:test";
import { calculateManualNutrition, parseManualEntry } from "../lib/manual-entry.ts";

test("parses a food with approximate calories and infers the meal", () => {
  assert.deepEqual(parseManualEntry("晚餐鸡腿肉 300多卡"), {
    name: "鸡腿肉",
    targetCalories: 300,
    mealType: "晚餐",
    originalText: "晚餐鸡腿肉 300多卡",
  });
});

test("parses a food with an explicit gram amount", () => {
  assert.deepEqual(parseManualEntry("午餐米饭 250克"), {
    name: "米饭",
    grams: 250,
    mealType: "午餐",
    originalText: "午餐米饭 250克",
  });
});

test("uses requested calories to infer serving size and macros", () => {
  const parsed = parseManualEntry("晚餐鸡腿肉 300多卡");
  assert.ok(parsed);
  const result = calculateManualNutrition(parsed, {
    ingredientName: "鸡腿肉",
    calories: 121,
    protein: 19.7,
    carbs: 0,
    fat: 4.12,
    fiber: 0,
    sugar: 0,
    saturatedFat: 1.1,
    sodium: 95,
    caffeine: 0,
    matched: true,
    nutritionSource: "USDA FoodData Central",
  });
  assert.deepEqual({ grams: result?.grams, calories: result?.calories, protein: result?.protein, fat: result?.fat, sodium: result?.sodium }, {
    grams: 247.9,
    calories: 300,
    protein: 48.8,
    fat: 10.2,
    sodium: 235.5,
  });
  assert.match(result?.note || "", /反推为约 247\.9 克/);
});

test("requires both a food name and an amount", () => {
  assert.equal(parseManualEntry("鸡腿肉"), null);
  assert.equal(parseManualEntry("300卡"), null);
});
