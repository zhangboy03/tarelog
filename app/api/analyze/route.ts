import { env } from "cloudflare:workers";
import { requireAppAccess } from "@/lib/access";
import { chatCompletionsEndpoint } from "@/lib/ai-endpoint";
import { resolveNutrition } from "@/lib/nutrition";
import { nutritionCache } from "@/lib/nutrition-cache";

type RuntimeEnv = {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  USDA_API_KEY?: string;
};

const runtime = env as unknown as RuntimeEnv;

function runtimeValue(name: keyof RuntimeEnv) {
  const value = runtime[name];
  if (typeof value === "string" && value) return value;
  return process.env[name] || "";
}

type VisionReading = {
  scene_type?: "ingredient" | "package";
  food_name?: string;
  generic_food_name?: string;
  food_name_en?: string;
  scale_text?: string;
  amount?: number;
  amount_unit?: string;
  label_basis_amount?: number;
  label_energy_kj?: number | null;
  label_energy_kcal?: number | null;
  label_protein?: number | null;
  label_carbs?: number | null;
  label_fat?: number | null;
  label_fiber?: number | null;
  label_sugar?: number | null;
  label_saturated_fat?: number | null;
  label_sodium_mg?: number | null;
  label_caffeine_mg?: number | null;
  confidence?: number;
  note?: string;
};

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function resolvePackageNutrition(reading: VisionReading) {
  const amount = Number(reading.amount || 0);
  const basis = Number(reading.label_basis_amount || 0);
  if (!Number.isFinite(amount) || !Number.isFinite(basis) || amount <= 0 || basis <= 0) return null;
  const labelNumber = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Math.max(0, Number(value));
  const energyKj = labelNumber(reading.label_energy_kj);
  const directEnergyKcal = labelNumber(reading.label_energy_kcal);
  const energyKcal = directEnergyKcal ?? (energyKj === null ? 0 : energyKj / 4.184);
  const labelValues = {
    protein: labelNumber(reading.label_protein),
    carbs: labelNumber(reading.label_carbs),
    fat: labelNumber(reading.label_fat),
    fiber: labelNumber(reading.label_fiber),
    sugar: labelNumber(reading.label_sugar),
    saturatedFat: labelNumber(reading.label_saturated_fat),
    sodium: labelNumber(reading.label_sodium_mg),
    caffeine: labelNumber(reading.label_caffeine_mg),
  };
  const factor = amount / basis;
  const unit = reading.amount_unit === "ml" ? "ml" : "g";
  const labelEnergy = directEnergyKcal !== null ? `${round(directEnergyKcal)}kcal` : energyKj !== null ? `${round(energyKj)}kJ` : "未读到";
  const observedFields = [
    ...(directEnergyKcal !== null || energyKj !== null ? ["calories"] : []),
    ...Object.entries(labelValues).filter(([, value]) => value !== null).map(([field]) => field),
  ];
  return {
    ingredientName: String(reading.food_name || "包装食品"),
    grams: amount,
    unit,
    calories: round(energyKcal * factor),
    protein: round((labelValues.protein || 0) * factor),
    carbs: round((labelValues.carbs || 0) * factor),
    fat: round((labelValues.fat || 0) * factor),
    fiber: round((labelValues.fiber || 0) * factor),
    sugar: round((labelValues.sugar || 0) * factor),
    saturatedFat: round((labelValues.saturatedFat || 0) * factor),
    sodium: round((labelValues.sodium || 0) * factor),
    caffeine: round((labelValues.caffeine || 0) * factor),
    observedFields,
    scaleText: `每 ${round(basis)}${unit}：能量 ${labelEnergy}，蛋白质 ${labelValues.protein === null ? "未读到" : `${round(labelValues.protein)}g`}，碳水 ${labelValues.carbs === null ? "未读到" : `${round(labelValues.carbs)}g`}，脂肪 ${labelValues.fat === null ? "未读到" : `${round(labelValues.fat)}g`}`,
    nutritionSource: `包装营养成分表 · 已按 ${round(amount)}${unit} 换算`,
  };
}

export async function POST(request: Request) {
  const denied = await requireAppAccess(request);
  if (denied) return denied;
  const apiKey = runtimeValue("AI_API_KEY");
  if (!apiKey) return Response.json({ error: "拍照模型尚未配置。" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "请选择一张食材或包装照片。" }, { status: 400 });
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "请上传 8MB 以内的 JPG、PNG 或 HEIC 图片。" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const binary = new Uint8Array(bytes).reduce((acc, byte) => acc + String.fromCharCode(byte), "");
  const dataUrl = `data:${file.type};base64,${btoa(binary)}`;
  const prompt = [
    "你是食物照片与包装营养标签识别助手。先判断照片是 ingredient（原始食材和电子秤）还是 package（食品包装或营养成分表）。",
    "ingredient：food_name 保留照片中可识别的具体品种名；generic_food_name 去掉产地、品牌、品种等修饰，填营养数据库通用中文名；food_name_en 填适合 USDA 查询的英文通用名并注明 raw。例如小白嘴山药应分别填小白嘴山药、山药、Chinese yam, raw。读取秤面数字并换算成克；不要凭外观猜重量，所有包装标签字段填 0。",
    "package：generic_food_name 填去掉品牌、切块方式和营销修饰后的通用食品类别，food_name_en 填适合 USDA 查询的英文通用类别，用于补足或替代标签没写出的营养项；这两项是匹配线索，不是标签抄录。例如鸡腿肉丁应归一为鸡腿肉和chicken thigh, meat only, raw。",
    "package：只抄录照片中真实可见的数据。food_name 填商品名；amount 填用户将吃掉的整包净含量，若只看到一份的重量则填一份；amount_unit 只允许 g 或 ml。",
    "package：label_basis_amount 填营养表数据对应的基准量，例如每100克填100、每30克一份填30；蛋白质、碳水、脂肪均填该基准量对应的克数。",
    "package：若标签可见，也抄录同一基准量的膳食纤维、糖、饱和脂肪（克），钠、咖啡因（毫克）；标签没写或看不清的字段填 null，真实写着 0 的字段才填 0，绝不凭照片自行编数值。",
    "package：严格区分能量的 kJ 与 kcal，标签是千焦只填 label_energy_kj，标签是千卡只填 label_energy_kcal，另一项填 null。忽略 NRV 百分比，不要把百分比当克数。",
    "若包装的净含量、每份重量或营养表关键数字看不清，对应标签数值填 null，并在 note 说明缺少什么。包装只有食品名称和净含量时也必须正常返回识别结果，营养表字段填 null，应用会尝试匹配通用食材营养。",
    "任何场景都不要自己估算营养或虚构标签数字。读不清时 confidence 必须低于 0.5。",
    "只输出符合 schema 的 JSON。",
  ].join("\n");

  const aiResponse = await fetch(chatCompletionsEndpoint(runtimeValue("AI_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1"), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: runtimeValue("AI_MODEL") || "qwen3.7-plus",
      messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }, { type: "text", text: prompt }] }],
      enable_thinking: false,
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "food_photo_reading",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              scene_type: { type: "string", enum: ["ingredient", "package"] },
              food_name: { type: "string" },
              generic_food_name: { type: "string" },
              food_name_en: { type: "string" },
              scale_text: { type: "string" },
              amount: { type: "number" },
              amount_unit: { type: "string", enum: ["g", "ml"] },
              label_basis_amount: { type: "number" },
              label_energy_kj: { type: ["number", "null"] },
              label_energy_kcal: { type: ["number", "null"] },
              label_protein: { type: ["number", "null"] },
              label_carbs: { type: ["number", "null"] },
              label_fat: { type: ["number", "null"] },
              label_fiber: { type: ["number", "null"] },
              label_sugar: { type: ["number", "null"] },
              label_saturated_fat: { type: ["number", "null"] },
              label_sodium_mg: { type: ["number", "null"] },
              label_caffeine_mg: { type: ["number", "null"] },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              note: { type: "string" },
            },
            required: ["scene_type", "food_name", "generic_food_name", "food_name_en", "scale_text", "amount", "amount_unit", "label_basis_amount", "label_energy_kj", "label_energy_kcal", "label_protein", "label_carbs", "label_fat", "label_fiber", "label_sugar", "label_saturated_fat", "label_sodium_mg", "label_caffeine_mg", "confidence", "note"],
          },
        },
      },
    }),
  });

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    console.error("Qwen analysis failed", aiResponse.status, detail.slice(0, 500));
    return Response.json({ error: "这张照片暂时没识别成功，请重拍并让秤面更清楚。" }, { status: 502 });
  }

  const payload = (await aiResponse.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content || "{}";
  let parsed: VisionReading;
  try {
    parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return Response.json({ error: "识别结果格式不完整，请重拍一次。" }, { status: 502 });
  }
  const isPackage = parsed.scene_type === "package";
  const packageMacros = isPackage ? resolvePackageNutrition(parsed) : null;
  const grams = packageMacros?.grams ?? Number(parsed.amount || 0);
  if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
    return Response.json({ error: "没有读到可靠的重量，请靠近秤面或包装净含量重拍。" }, { status: 422 });
  }

  const id = crypto.randomUUID();
  const referenceNutrition = await resolveNutrition({
    name: String(parsed.food_name || "未知食材"),
    genericName: String(parsed.generic_food_name || ""),
    englishName: String(parsed.food_name_en || ""),
    grams,
    apiKey,
    baseUrl: runtimeValue("AI_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: runtimeValue("AI_MODEL") || "qwen3.7-plus",
    usdaApiKey: runtimeValue("USDA_API_KEY") || "DEMO_KEY",
    cache: nutritionCache,
  });
  const nutritionFields = ([
    ["热量", "calories"],
    ["蛋白质", "protein"],
    ["碳水", "carbs"],
    ["脂肪", "fat"],
    ["膳食纤维", "fiber"],
    ["糖", "sugar"],
    ["饱和脂肪", "saturatedFat"],
    ["钠", "sodium"],
    ["咖啡因", "caffeine"],
  ] as const);
  const missingLabelFields = packageMacros ? nutritionFields.filter(([, field]) => !packageMacros.observedFields.includes(field)).map(([label]) => label) : [];
  const labelEstimatedFields = referenceNutrition.matched ? missingLabelFields : [];
  const unfilledLabelFields = referenceNutrition.matched ? [] : missingLabelFields;
  const databaseOnlyFields = isPackage && !packageMacros && referenceNutrition.matched
    ? ["热量", "蛋白质", "碳水", "脂肪", "膳食纤维", "糖", "饱和脂肪", "钠", "咖啡因"]
    : [];
  const estimatedFields = packageMacros ? labelEstimatedFields : databaseOnlyFields;
  const macros = packageMacros ? {
    ...packageMacros,
    calories: packageMacros.observedFields.includes("calories") ? packageMacros.calories : referenceNutrition.calories,
    protein: packageMacros.observedFields.includes("protein") ? packageMacros.protein : referenceNutrition.protein,
    carbs: packageMacros.observedFields.includes("carbs") ? packageMacros.carbs : referenceNutrition.carbs,
    fat: packageMacros.observedFields.includes("fat") ? packageMacros.fat : referenceNutrition.fat,
    fiber: packageMacros.observedFields.includes("fiber") ? packageMacros.fiber : referenceNutrition.fiber,
    sugar: packageMacros.observedFields.includes("sugar") ? packageMacros.sugar : referenceNutrition.sugar,
    saturatedFat: packageMacros.observedFields.includes("saturatedFat") ? packageMacros.saturatedFat : referenceNutrition.saturatedFat,
    sodium: packageMacros.observedFields.includes("sodium") ? packageMacros.sodium : referenceNutrition.sodium,
    caffeine: packageMacros.observedFields.includes("caffeine") ? packageMacros.caffeine : referenceNutrition.caffeine,
  } : referenceNutrition;
  const result = {
    id,
    ingredientName: macros.ingredientName,
    detectedName: String(parsed.food_name || "未知食材"),
    grams,
    unit: packageMacros?.unit || "g",
    sourceType: isPackage ? "package" : "ingredient",
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
    scaleText: packageMacros?.scaleText || String(parsed.scale_text || (isPackage ? `包装净含量 ${round(grams)}${parsed.amount_unit === "ml" ? "ml" : "g"}` : "")),
    note: String(parsed.note || ""),
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    sugar: macros.sugar,
    saturatedFat: macros.saturatedFat,
    sodium: macros.sodium,
    caffeine: macros.caffeine,
    nutritionMatched: packageMacros ? packageMacros.observedFields.includes("calories") || referenceNutrition.matched : referenceNutrition.matched,
    nutritionSource: packageMacros
      ? `${packageMacros.nutritionSource}${labelEstimatedFields.length ? `；${labelEstimatedFields.join("、")}按通用食物数据估算` : ""}${unfilledLabelFields.length ? `；${unfilledLabelFields.join("、")}来源未提供` : ""}`
      : `${referenceNutrition.nutritionSource}${isPackage && referenceNutrition.matched ? ` · 已按包装净含量 ${round(grams)}${parsed.amount_unit === "ml" ? "ml" : "g"} 换算` : ""}`,
    nutritionSourceUrl: packageMacros && !labelEstimatedFields.length ? undefined : referenceNutrition.nutritionSourceUrl,
    estimatedFields,
  };
  return Response.json({ analysis: result });
}
