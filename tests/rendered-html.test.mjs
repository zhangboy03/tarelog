import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("separates the public project page from the protected private journal", async () => {
  const [page, journal, client, layout, login, accessLib, accessApi, agentGuide, llms] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/journal/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/KitchenApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/access.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
    readFile(new URL("../app/llms.txt/route.ts", import.meta.url), "utf8"),
  ]);
  for (const projectSurface of ["Tarelog", "Know what you eat", "Live a little better", "One meal is a moment", "Many meals make a pattern"]) {
    assert.match(page, new RegExp(projectSurface));
  }
  assert.match(page, /tarelog-scale\.png/);
  for (const removedClutter of ["ScaleReceipt", "JournalPreview", "workflow-grid", "architecture-flow", "quickstart-section", "Useful automation", "Your food history is not a public demo"]) {
    assert.doesNotMatch(page, new RegExp(removedClutter));
  }
  assert.doesNotMatch(page, /<KitchenApp \/>/);
  assert.match(journal, /<KitchenApp \/>/);
  assert.match(journal, /requestHasAccess/);
  assert.match(journal, /redirect\("\/login\?next=%2Fjournal"\)/);
  assert.match(login, /!requested\.startsWith\("\/\/"\)/);
  assert.match(login, /!requested\.includes\("\\\\"\)/);
  assert.match(layout, /Tarelog/);
  assert.match(client, /正在加载饮食记录/);
  assert.match(client, /response\.status === 401/);
  assert.match(client, /window\.location\.assign\(`\/login\?next=/);
  assert.match(accessLib, /APP_ACCESS_TOKEN/);
  assert.match(accessLib, /HttpOnly; SameSite=Strict/);
  assert.match(accessLib, /const accessCookieMaxAge = 60 \* 60 \* 24 \* 400/);
  assert.match(accessLib, /Max-Age=\$\{accessCookieMaxAge\}/);
  assert.match(accessApi, /verifyAccessToken/);
  assert.match(accessApi, /Set-Cookie/);
  assert.match(agentGuide, /Start with the person/);
  assert.match(agentGuide, /Human confirmation comes before storage/);
  assert.match(llms, /Help a person/);
  assert.match(llms, /Facts before guesses/);
  assert.doesNotMatch(`${page}\n${layout}`, /\bAI\b|\bagents?\b/i);
  assert.doesNotMatch(`${page}\n${layout}`, /codex-preview|Your site is taking shape/);
});

test("contains configurable personal nutrition surfaces without partner ordering", async () => {
  const [client, profile, layout, packageJson, analyzer, nutrition, nutritionApi, manualApi, manualParser, kitchenApi, schema, shortcutGenerator, envExample] = await Promise.all([
    readFile(new URL("../app/KitchenApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/profile.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/nutrition.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/nutrition/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/manual-entry/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/manual-entry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/kitchen/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/apple-health-shortcut.swift", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  for (const surface of ["今日营养", "长期趋势", "记录食物"]) assert.match(client, new RegExp(surface));
  assert.match(client, /const adminTabs = \["今日营养", "记录食物", "长期趋势"\]/);
  for (const removedSurface of ["周末订单", "菜谱库", "想吃什么", "点菜单", "GuestView", "RecipeLibrary", "createOrder", "createWish", "setOrderStatus"]) {
    assert.doesNotMatch(`${client}\n${kitchenApi}`, new RegExp(removedSurface));
  }
  assert.doesNotMatch(`${envExample}\n${client}\n${analyzer}\n${nutritionApi}\n${kitchenApi}`, /ADMIN_ACCESS_KEY|x-kitchen-key|GUEST_ACCESS_KEY/);
  assert.match(client, /data\.quickLogItems/);
  assert.match(profile, /QUICK_LOG_ITEMS_JSON/);
  assert.doesNotMatch(client, /const quickLogItems\s*=/);
  assert.match(client, /MacroRing/);
  assert.match(client, /与自定义目标的差距/);
  assert.match(client, /不判断营养是否充足/);
  for (const dailyFeature of ["今天都吃了什么", "今日总账", "全天明细", "识别与补记记录"]) assert.match(client, new RegExp(dailyFeature));
  for (const removedAdvice of ["训练日怎么吃", "两周后怎么调整"]) assert.doesNotMatch(client, new RegExp(removedAdvice));
  assert.doesNotMatch(client, /\.slice\(0, 5\)/);
  assert.doesNotMatch(kitchenApi, /analyses\.createdAt\)\)\.limit\(12\)/);
  assert.match(kitchenApi, /mealLogs\.createdAt/);
  assert.match(kitchenApi, /groupBy\(mealLogs\.mealDate\)/);
  assert.match(kitchenApi, /action === "updateMeal"/);
  assert.match(kitchenApi, /db\.update\(mealLogs\)/);
  assert.match(kitchenApi, /action === "deleteMeal"/);
  assert.match(kitchenApi, /db\.delete\(mealLogs\)/);
  for (const range of ["7 天", "30 天", "90 天", "全部"]) assert.match(client, new RegExp(range));
  for (const trendFeature of ["热量与目标", "目标附近", "宏量营养", "每日汇总", "空白日期代表没有记录"]) assert.match(client, new RegExp(trendFeature));
  assert.match(client, /recordedDays\.length \|\| 1/);
  for (const packagingFeature of ["照片识别", "添加食物照片", "包装标签换算", "实际吃掉"]) assert.match(client, new RegExp(packagingFeature));
  for (const photoSource of ["照片识别", "照片仅用于识别", "相机或图库"]) assert.match(client, new RegExp(photoSource));
  for (const queueFeature of ["一次可选多张", "等待你确认", "本组照片已处理完"]) assert.match(client, new RegExp(queueFeature));
  assert.match(client, /const \[photoQueue, setPhotoQueue\] = useState/);
  assert.match(client, /Array\.from\(event\.currentTarget\.files \|\| \[\]\)/);
  assert.match(client, /await analyzePhoto\(ready\[0\]\.file/);
  assert.match(client, /void analyzePhoto\(remaining\[0\]\.file/);
  assert.match(client, /if \(confirmingPhoto\) advancePhoto/);
  assert.match(client, /if \(isPhotoResult && currentPhoto\) return advancePhoto/);
  assert.match(client, /ref=\{input\} type="file" accept="image\/\*" multiple/);
  assert.equal(client.match(/type="file"/g)?.length, 1);
  assert.doesNotMatch(client, /capture="environment"|cameraInput|libraryInput|photo-source-actions/);
  for (const removedPhotoGuide of ["拍对的三个关键", "食材：食物和秤面一起入镜", "包装：拍正营养表"]) assert.doesNotMatch(client, new RegExp(removedPhotoGuide));
  for (const manualFeature of ["文字补记", "鸡腿肉 300 多卡", "自动估算，进入确认", "输入原文", "估算重量"]) assert.match(client, new RegExp(manualFeature));
  assert.match(client, /api\/manual-entry/);
  assert.match(manualApi, /parseManualEntry/);
  assert.match(manualApi, /resolveNutrition/);
  assert.match(manualApi, /sourceType: "manual"/);
  assert.match(manualParser, /targetCalories/);
  assert.match(manualParser, /反推为约/);
  for (const labelField of ["scene_type", "label_basis_amount", "label_energy_kj", "label_energy_kcal", "label_protein", "label_carbs", "label_fat"]) assert.match(analyzer, new RegExp(labelField));
  for (const field of ["fiber", "sugar", "saturatedFat", "sodium", "caffeine"]) {
    assert.match(client, new RegExp(field));
    assert.match(schema, new RegExp(field));
    assert.match(kitchenApi, new RegExp(field));
  }
  for (const labelField of ["label_fiber", "label_sugar", "label_saturated_fat", "label_sodium_mg", "label_caffeine_mg"]) assert.match(analyzer, new RegExp(labelField));
  for (const extendedLabel of ["膳食纤维", "糖", "饱和脂肪", "钠", "咖啡因"]) assert.match(client, new RegExp(extendedLabel));
  for (const healthType of ["Dietary Energy", "Protein", "Carbohydrates", "Total Fat", "Fiber", "Sugar", "Saturated Fat", "Sodium", "Caffeine"]) assert.match(shortcutGenerator, new RegExp(healthType));
  assert.match(client, /同步今天新增/);
  assert.match(client, /增量同步今天/);
  assert.match(client, /Tarelog Sync Today/);
  assert.match(shortcutGenerator, /api\/health-sync/);
  assert.match(shortcutGenerator, /Repeat\(iterating:/);
  assert.match(shortcutGenerator, /X-Health-Sync-Token/);
  assert.doesNotMatch(shortcutGenerator, /URLQueryItem\(name: "token"/);
  assert.doesNotMatch(`${client}\n${analyzer}\n${schema}\n${shortcutGenerator}`, /water|Water|饮水|喝水/);
  assert.match(analyzer, /energyKj \/ 4\.184/);
  assert.match(analyzer, /包装营养成分表/);
  assert.match(analyzer, /包装只有食品名称和净含量时也必须正常返回识别结果/);
  assert.doesNotMatch(analyzer, /包装信息还不完整，请把净含量和营养成分表拍清楚后重试/);
  for (const correctionFeature of ["查看并修正", "重新联网匹配营养", "手工修正", "保存修改"]) assert.match(client, new RegExp(correctionFeature));
  for (const ledgerEditFeature of ["修改：", "重量 / 容量", "删除这条", "网页修改不会回改健康里的旧样本"]) assert.match(client, new RegExp(ledgerEditFeature));
  for (const clearAction of ["确认并记入今天", "关闭，不记录", "确认前不会保存照片、识别结果或今日总账", "请先匹配营养，或手工填写热量", "不会重复记入今天"]) assert.match(client, new RegExp(clearAction));
  assert.doesNotMatch(client, /保存，暂不计入今天|保存并计入今天/);
  for (const microUx of ["点按修改", "常用快捷", "左右滑动查看更多", "正在删除", "aria-current", "aria-busy"]) assert.match(client, new RegExp(microUx));
  assert.ok(client.indexOf('className="photo-workbench"') < client.indexOf('className="quick-log-dock"'));
  assert.ok(client.indexOf('className="quick-log-dock"') < client.indexOf('className="manual-entry"'));
  assert.match(client, /const isPhotoResult = Boolean\(analysis && !editingSaved && analysis\.sourceType !== "manual"\)/);
  assert.ok(client.indexOf("{isPhotoResult && renderAnalysisResult()}") < client.indexOf('className="quick-log-dock"'));
  assert.ok(client.indexOf("{!isPhotoResult && renderAnalysisResult()}") > client.indexOf('className="manual-entry"'));
  assert.doesNotMatch(nutrition, /enable_search: true|forced_search: true/);
  assert.match(nutrition, /api\.nal\.usda\.gov\/fdc\/v1\/foods\/search/);
  assert.match(nutrition, /小白嘴山药/);
  assert.match(nutrition, /Grapes, red or green, raw/);
  assert.match(nutrition, /鸡腿肉丁/);
  assert.match(nutrition, /food-details\/173627\/nutrients/);
  assert.match(nutrition, /fdc\.nal\.usda\.gov/);
  assert.match(nutritionApi, /resolveNutrition/);
  assert.match(profile, /resolveTargetMacros/);
  assert.match(profile, /return kcal && protein && carbs && fat/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("protects every journal data route", async () => {
  const routeNames = ["analyze", "kitchen", "manual-entry", "nutrition"];
  for (const routeName of routeNames) {
    const source = await readFile(new URL(`../app/api/${routeName}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /import \{ requireAppAccess \}/);
    const handlerCount = [...source.matchAll(/export async function (?:GET|POST|PUT|DELETE)/g)].length;
    assert.ok(handlerCount > 0);
    assert.equal([...source.matchAll(/await requireAppAccess\(request\)/g)].length, handlerCount);
  }
});

test("uses the calm utility design system across the product", async () => {
  const [styles, layout, worker] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  for (const token of ["--canvas: #f1f4f2", "--accent: #27684f", "--display:", ".nutrition-rings", ".calorie-chart", ".ledger-editor", ".quick-log-dock", ".manual-entry", ".photo-workbench", ".mobile-admin-nav"]) {
    assert.match(styles, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(styles, /min-height: 48px/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /font-size: 1rem/);
  assert.match(styles, /\.photo-drop\.has-photo/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(styles, /#f3ead5|#bd452d|Songti SC|STSong/);
  assert.match(layout, /themeColor: "#f1f4f2"/);
  assert.match(worker, /env\.ASSETS \? env\.ASSETS\.fetch\(assetRequest\) : fetch\(assetRequest\)/);
});
