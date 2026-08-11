export type TargetMacros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type QuickLogItem = {
  id: string;
  name: string;
  mealType: string;
  serving: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  caffeine: number;
};

type ProfileEnvironment = Record<string, string | undefined>;

function positiveNumber(value: unknown, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
}

function nonNegativeNumber(value: unknown, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

export function resolveTimeZone(value: unknown) {
  const candidate = String(value || "UTC").trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

export function resolveTargetMacros(environment: ProfileEnvironment): TargetMacros | null {
  const kcal = positiveNumber(environment.TARGET_KCAL, 10000);
  const protein = positiveNumber(environment.TARGET_PROTEIN, 1000);
  const carbs = positiveNumber(environment.TARGET_CARBS, 2000);
  const fat = positiveNumber(environment.TARGET_FAT, 1000);
  return kcal && protein && carbs && fat ? { kcal, protein, carbs, fat } : null;
}

export function resolveQuickLogItems(value: unknown): QuickLogItem[] {
  if (!value) return [];
  let items: unknown;
  try {
    items = JSON.parse(String(value));
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];

  return items.slice(0, 12).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const input = item as Record<string, unknown>;
    const name = String(input.name || "").trim().slice(0, 50);
    const grams = positiveNumber(input.grams, 10000);
    const calories = nonNegativeNumber(input.calories, 10000);
    const protein = nonNegativeNumber(input.protein, 10000);
    const carbs = nonNegativeNumber(input.carbs, 10000);
    const fat = nonNegativeNumber(input.fat, 10000);
    const fiber = nonNegativeNumber(input.fiber || 0, 10000);
    const sugar = nonNegativeNumber(input.sugar || 0, 10000);
    const saturatedFat = nonNegativeNumber(input.saturatedFat || 0, 10000);
    const sodium = nonNegativeNumber(input.sodium || 0, 100000);
    const caffeine = nonNegativeNumber(input.caffeine || 0, 100000);
    if (!name || grams === null || [calories, protein, carbs, fat, fiber, sugar, saturatedFat, sodium, caffeine].some((number) => number === null)) return [];
    return [{
      id: String(input.id || `quick-${index + 1}`).trim().slice(0, 80),
      name,
      mealType: String(input.mealType || "加餐").trim().slice(0, 12) || "加餐",
      serving: String(input.serving || `${grams}g`).trim().slice(0, 50),
      grams,
      calories: calories!,
      protein: protein!,
      carbs: carbs!,
      fat: fat!,
      fiber: fiber!,
      sugar: sugar!,
      saturatedFat: saturatedFat!,
      sodium: sodium!,
      caffeine: caffeine!,
    }];
  });
}

export function resolveProfileSettings(environment: ProfileEnvironment) {
  return {
    timeZone: resolveTimeZone(environment.APP_TIME_ZONE),
    targetMacros: resolveTargetMacros(environment),
    quickLogItems: resolveQuickLogItems(environment.QUICK_LOG_ITEMS_JSON),
  };
}
