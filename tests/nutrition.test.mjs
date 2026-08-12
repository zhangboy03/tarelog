import assert from "node:assert/strict";
import test from "node:test";
import { observedLabelNumber, resolveCatalogNutrition, resolveNutrition, resolveUsdaNutrition } from "../lib/nutrition.ts";

test("keeps real label zero but rejects invalid values as unobserved", () => {
  assert.equal(observedLabelNumber(0), 0);
  assert.equal(observedLabelNumber(12.5), 12.5);
  assert.equal(observedLabelNumber(-0.1), null);
  assert.equal(observedLabelNumber("0"), null);
  assert.equal(observedLabelNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(observedLabelNumber(null), null);
});

test("uses a sourced local canonical food immediately after name normalization", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  let cacheReads = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return Response.json({ choices: [{ message: { content: JSON.stringify({ generic_name_zh: "山药", search_name_en: "Chinese yam, raw" }) } }] });
  };
  try {
    const result = await resolveNutrition({
      name: "河北脆山药新品种",
      grams: 100,
      apiKey: "test",
      baseUrl: "https://example.invalid",
      model: "test",
      cache: {
        async get() {
          cacheReads += 1;
          return {
            ingredientName: "河北脆山药新品种",
            calories: 999,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            saturatedFat: 0,
            sodium: 0,
            caffeine: 0,
            matched: true,
            nutritionSource: "USDA FoodData Central · competing cache fixture",
            nutritionSourceUrl: "https://fdc.nal.usda.gov/",
          };
        },
        async set() {
          assert.fail("a sourced local canonical food must not be overwritten");
        },
      },
    });
    assert.equal(fetchCalls, 1);
    assert.equal(cacheReads, 0);
    assert.equal(result.calories, 58.1);
    assert.equal(result.nutritionSource, "中国食物成分表 · 山药（鲜，每100克可食部）");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes a named Chinese yam variety to stable local nutrition", () => {
  const result = resolveCatalogNutrition("小白嘴山药", 440);
  assert.deepEqual(result, {
    ingredientName: "小白嘴山药",
    calories: 255.6,
    protein: 8.4,
    carbs: 54.6,
    fat: 0.9,
    fiber: 0,
    sugar: 0,
    saturatedFat: 0,
    sodium: 0,
    caffeine: 0,
    matched: true,
    nutritionSource: "中国食物成分表 · 山药（鲜，每100克可食部）",
    nutritionSourceUrl: "https://nlc.chinanutri.cn/fq/foodinfo/525.html",
  });
});

test("matches packaged diced chicken thigh from only its name and net weight", () => {
  const result = resolveCatalogNutrition("鲜鸡腿肉丁", 342);
  assert.deepEqual(result, {
    ingredientName: "鲜鸡腿肉丁",
    calories: 413.8,
    protein: 67.4,
    carbs: 0,
    fat: 14.1,
    fiber: 0,
    sugar: 0,
    saturatedFat: 3.8,
    sodium: 324.9,
    caffeine: 0,
    matched: true,
    nutritionSource: "USDA FoodData Central · Chicken thigh, meat only, raw（每100克）",
    nutritionSourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/173627/nutrients",
  });
});

test("matches exact aliases without confusing cooked rice with raw rice", () => {
  const cooked = resolveCatalogNutrition("米饭", 100);
  assert.equal(cooked?.ingredientName, "米饭");
  assert.equal(cooked?.calories, 116);
  assert.equal(cooked?.matched, false);
  assert.equal(resolveCatalogNutrition("米饭 100克", 100), null);
  assert.equal(resolveCatalogNutrition("蛋白粉", 100), null);
});

test("reuses a cached authoritative match before making another network request", async () => {
  const calls = [];
  const result = await resolveNutrition({
    name: "紫芜菁",
    genericName: "芜菁",
    englishName: "turnip",
    grams: 250,
    apiKey: "",
    baseUrl: "https://example.invalid",
    model: "unused",
    cache: {
      async get(keys, ingredientName, grams) {
        calls.push({ keys, ingredientName, grams });
        return {
          ingredientName,
          calories: 70,
          protein: 2.3,
          carbs: 16.1,
          fat: 0.3,
          fiber: 4.5,
          sugar: 9.2,
          saturatedFat: 0.1,
          sodium: 167,
          caffeine: 0,
          matched: true,
          nutritionSource: "USDA FoodData Central · Turnips, raw",
          nutritionSourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/170465/nutrients",
        };
      },
      async set() {
        assert.fail("a cache hit must not be overwritten");
      },
    },
  });

  assert.deepEqual(calls, [{ keys: ["芜菁", "turnip", "紫芜菁"], ingredientName: "紫芜菁", grams: 250 }]);
  assert.equal(result.calories, 70);
  assert.equal(result.fiber, 4.5);
  assert.equal(result.ingredientName, "紫芜菁");
});

test("maps extended USDA nutrients into the recorded serving", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ foods: [{
    fdcId: 123,
    description: "Test fruit, raw",
    dataType: "SR Legacy",
    foodNutrients: [
      ["208", 50], ["203", 1], ["204", 0.4], ["205", 12], ["291", 2.5],
      ["269", 8], ["606", 0.1], ["307", 4], ["262", 3],
    ].map(([nutrientNumber, value]) => ({ nutrientNumber, value })),
  }] });
  try {
    const result = await resolveUsdaNutrition({ name: "测试水果", englishName: "test fruit raw fixture", grams: 200 });
    assert.deepEqual({ fiber: result?.fiber, sugar: result?.sugar, saturatedFat: result?.saturatedFat, sodium: result?.sodium, caffeine: result?.caffeine }, {
      fiber: 5,
      sugar: 16,
      saturatedFat: 0.2,
      sodium: 8,
      caffeine: 6,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an unrelated USDA search result instead of caching it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ foods: [{
    fdcId: 456,
    description: "Apples, raw, with skin",
    dataType: "Foundation",
    foodNutrients: [["208", 52], ["203", 0.3], ["204", 0.2], ["205", 14]].map(([nutrientNumber, value]) => ({ nutrientNumber, value })),
  }] });
  try {
    const result = await resolveUsdaNutrition({ name: "火龙果", englishName: "dragonfruit unmatched fixture", grams: 100 });
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps a recognizable correction result when nutrition services are unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network unavailable"); };
  try {
    const result = await resolveNutrition({
      name: "未收录的新食材",
      grams: 342,
      apiKey: "test",
      baseUrl: "https://example.invalid",
      model: "test",
    });
    assert.equal(result.matched, false);
    assert.equal(result.ingredientName, "未收录的新食材");
    assert.match(result.nutritionSource, /请手工修正/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
