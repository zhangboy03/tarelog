"use client";

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Analysis = {
  id: string;
  ingredientName: string;
  detectedName?: string;
  grams: number;
  confidence: number;
  scaleText: string;
  note?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  caffeine: number;
  nutritionMatched?: boolean;
  nutritionSource?: string;
  nutritionSourceUrl?: string;
  estimatedFields?: string[];
  sourceType?: "ingredient" | "package" | "manual";
  mealType?: string;
  unit?: "g" | "ml";
};
type MealLog = {
  id: string;
  mealDate: string;
  mealType: string;
  ingredientName: string;
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
  createdAt: string;
};
type DailyNutrition = {
  mealDate: string;
  entries: number;
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
type NutritionTotals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; saturatedFat: number; sodium: number; caffeine: number };
type QuickLogItem = {
  id: string; name: string; mealType: string; serving: string; grams: number;
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  sugar: number; saturatedFat: number; sodium: number; caffeine: number;
};
type QueuedPhoto = { file: File; preview: string };
type Bootstrap = {
  timeZone: string;
  targetMacros: { kcal: number; protein: number; carbs: number; fat: number } | null;
  quickLogItems: QuickLogItem[];
  analyses?: Analysis[];
  logs?: MealLog[];
  history?: DailyNutrition[];
};

const adminTabs = ["今日营养", "记录食物", "长期趋势"] as const;

function localDate(timeZone: string, offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

function localTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shortDate(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${month}月${day}日`;
}

function MacroRing({ label, value, target, unit, tone }: { label: string; value: number; target?: number; unit: string; tone: string }) {
  const configured = Boolean(target && target > 0);
  const percent = configured ? Math.round((value / target!) * 100) : 0;
  const remaining = configured ? Math.round(target! - value) : 0;
  const ringStyle = { "--ring-progress": `${Math.min(100, Math.max(0, percent)) * 3.6}deg`, "--ring-tone": tone } as CSSProperties;
  return (
    <article className={`macro-ring-card ${configured && remaining < 0 ? "over" : configured && remaining === 0 ? "done" : ""}`}>
      <div className="macro-ring" style={ringStyle}>
        <div><strong>{configured ? `${Math.max(0, percent)}%` : Math.round(value)}</strong><span>{label}</span></div>
      </div>
      <p><b>{Math.round(value)}</b>{configured ? ` / ${target}${unit}` : unit}</p>
      <small>{configured ? remaining > 0 ? `还差 ${remaining}${unit}` : remaining === 0 ? "刚好达标" : `超过 ${Math.abs(remaining)}${unit}` : "尚未设置个人目标"}</small>
    </article>
  );
}

function targetGapSummary(totals: NutritionTotals, target: NonNullable<Bootstrap["targetMacros"]>) {
  if (!totals.kcal) return ["还没有记录食物。先从下一餐开始，确认名称、重量和营养数据后再记入今天。"];
  const gap = (label: string, value: number, goal: number, unit: string) => {
    const difference = Math.round(goal - value);
    return difference > 0 ? `${label}距自定义目标约 ${difference}${unit}。` : difference < 0 ? `${label}高于自定义目标约 ${Math.abs(difference)}${unit}。` : `${label}与自定义目标相同。`;
  };
  return [
    gap("能量", totals.kcal, target.kcal, " 千卡"),
    gap("蛋白质", totals.protein, target.protein, "g"),
    gap("碳水", totals.carbs, target.carbs, "g"),
    gap("脂肪", totals.fat, target.fat, "g"),
  ];
}

const extendedNutrients = [
  { field: "fiber", label: "膳食纤维", unit: "g" },
  { field: "sugar", label: "糖", unit: "g" },
  { field: "saturatedFat", label: "饱和脂肪", unit: "g" },
  { field: "sodium", label: "钠", unit: "mg" },
  { field: "caffeine", label: "咖啡因", unit: "mg" },
] as const;

function NutritionDashboard({ data, onRefresh }: { data: Bootstrap; onRefresh: () => void }) {
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [ledgerActivity, setLedgerActivity] = useState<"save" | "delete" | "">("");
  const [ledgerMessage, setLedgerMessage] = useState("");
  const editorTitle = useRef<HTMLHeadingElement>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const editingLogId = editingLog?.id;
  const logs = data.logs || [];
  const totals = logs.reduce((sum, log) => ({ kcal: sum.kcal + log.calories, protein: sum.protein + log.protein, carbs: sum.carbs + log.carbs, fat: sum.fat + log.fat, fiber: sum.fiber + log.fiber, sugar: sum.sugar + log.sugar, saturatedFat: sum.saturatedFat + log.saturatedFat, sodium: sum.sodium + log.sodium, caffeine: sum.caffeine + log.caffeine }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, caffeine: 0 });
  const totalGrams = logs.reduce((sum, log) => sum + log.grams, 0);
  const today = logs[0]?.mealDate || localDate(data.timeZone);
  const todayLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "UTC", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${today}T12:00:00Z`));
  const target = data.targetMacros;
  const gapSummary = target ? targetGapSummary(totals, target) : ["还没有设置个人营养目标。记录功能可以照常使用，目标请按自己的情况配置。"];
  const ledgerBusy = Boolean(ledgerActivity);

  useEffect(() => {
    if (!editingLogId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    editorTitle.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingLog(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.setTimeout(() => editTrigger.current?.focus(), 0);
    };
  }, [editingLogId]);

  function updateLogGrams(next: number) {
    setEditingLog((current) => {
      if (!current || !Number.isFinite(next) || next < 0) return current;
      if (!next || !current.grams) return { ...current, grams: next };
      const factor = next / current.grams;
      return {
        ...current,
        grams: next,
        calories: Math.round(current.calories * factor * 10) / 10,
        protein: Math.round(current.protein * factor * 10) / 10,
        carbs: Math.round(current.carbs * factor * 10) / 10,
        fat: Math.round(current.fat * factor * 10) / 10,
        fiber: Math.round(current.fiber * factor * 10) / 10,
        sugar: Math.round(current.sugar * factor * 10) / 10,
        saturatedFat: Math.round(current.saturatedFat * factor * 10) / 10,
        sodium: Math.round(current.sodium * factor * 10) / 10,
        caffeine: Math.round(current.caffeine * factor * 10) / 10,
      };
    });
  }

  function updateLogNutrition(field: "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "saturatedFat" | "sodium" | "caffeine", next: number) {
    if (!Number.isFinite(next) || next < 0) return;
    setEditingLog((current) => current ? { ...current, [field]: next } : current);
  }

  async function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLog) return;
    setLedgerActivity("save"); setLedgerMessage("");
    const response = await fetch("/api/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateMeal", ...editingLog }) });
    const payload = await response.json() as { error?: string };
    setLedgerActivity("");
    if (!response.ok) return setLedgerMessage(payload.error || "这条记录没有保存成功。");
    setEditingLog(null); onRefresh();
  }

  async function deleteMeal() {
    if (!editingLog || !window.confirm(`删除“${editingLog.ingredientName}”这条当天记录？`)) return;
    setLedgerActivity("delete"); setLedgerMessage("");
    const response = await fetch("/api/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteMeal", id: editingLog.id }) });
    const payload = await response.json() as { error?: string };
    setLedgerActivity("");
    if (!response.ok) return setLedgerMessage(payload.error || "这条记录没有删除成功。");
    setEditingLog(null); onRefresh();
  }

  return <section className="admin-panel nutrition-panel">
    <div className="panel-intro"><p className="eyebrow">{todayLabel}</p><h2>今天都吃了什么</h2></div>
    <div className="nutrition-rings" aria-label="今日营养完成圆环">
      <MacroRing label="能量" value={totals.kcal} target={target?.kcal} unit="千卡" tone="#8cc8a8" />
      <MacroRing label="蛋白质" value={totals.protein} target={target?.protein} unit="g" tone="#6eac91" />
      <MacroRing label="碳水" value={totals.carbs} target={target?.carbs} unit="g" tone="#b0d8c2" />
      <MacroRing label="脂肪" value={totals.fat} target={target?.fat} unit="g" tone="#d3e6dc" />
    </div>
    <section className="nutrient-receipt" aria-label="今日扩展营养">
      <header><span>扩展营养</span><small>来自包装标签或可核对的食物数据；0 也可能表示来源未提供</small></header>
      <div>{extendedNutrients.map((item) => <p key={item.field}><span>{item.label}</span><strong>{Math.round(totals[item.field] * 10) / 10}</strong><small>{item.unit}</small></p>)}</div>
    </section>
    <section className="today-ledger" aria-labelledby="today-ledger-title">
      <header><div><span>今日总账</span><h3 id="today-ledger-title">全天明细</h3></div><p><strong>{logs.length}</strong> 笔 · 共 {Math.round(totalGrams)}g</p></header>
      {logs.length === 0 ? <div className="ledger-empty"><strong>今天还没有记入食物</strong><p>去“记录食物”拍照或文字补记，确认后会按时间完整出现在这里。</p></div> : <ol>{logs.map((log) => <li key={log.id}><button className="ledger-row" onClick={(event) => { editTrigger.current = event.currentTarget; setEditingLog({ ...log }); setLedgerMessage(""); }} aria-label={`修改 ${log.ingredientName}`}>
        <time dateTime={log.createdAt}>{localTime(log.createdAt, data.timeZone)}</time>
        <span className="ledger-food"><span>{log.mealType}</span><strong>{log.ingredientName}</strong><small>{Math.round(log.grams * 10) / 10}g<span className="ledger-mobile-edit"> · 点按修改</span></small></span>
        <span className="ledger-energy"><strong>{Math.round(log.calories)}</strong><span>千卡</span></span>
        <span className="ledger-macros"><span>蛋白 {Math.round(log.protein * 10) / 10}g</span><span>碳水 {Math.round(log.carbs * 10) / 10}g</span><span>脂肪 {Math.round(log.fat * 10) / 10}g</span></span>
        <span className="ledger-edit-hint">修改</span>
      </button></li>)}</ol>}
    </section>
    {editingLog && <div className="ledger-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingLog(null)}>
      <form className="ledger-editor" onSubmit={saveMeal} role="dialog" aria-modal="true" aria-labelledby="ledger-editor-title">
        <header><div><span>当天记录</span><h3 id="ledger-editor-title" ref={editorTitle} tabIndex={-1}>修改：{editingLog.ingredientName}</h3></div><button type="button" onClick={() => setEditingLog(null)} aria-label="关闭修改面板">×</button></header>
        <div className="ledger-editor-core">
          <label><span>食物名称</span><input value={editingLog.ingredientName} maxLength={50} onChange={(event) => setEditingLog({ ...editingLog, ingredientName: event.target.value })} /></label>
          <label><span>餐次</span><select value={editingLog.mealType} onChange={(event) => setEditingLog({ ...editingLog, mealType: event.target.value })}><option>早餐</option><option>午餐</option><option>晚餐</option><option>加餐</option><option>夜宵</option><option>烹调用油</option></select></label>
          <label><span>重量 / 容量</span><div><input type="number" inputMode="decimal" min="0.1" max="10000" step="0.1" value={editingLog.grams} onChange={(event) => updateLogGrams(Number(event.target.value))} /><small>g / ml</small></div></label>
        </div>
        <div className="result-macros editable" aria-label="修改主要营养"><label><input type="number" inputMode="decimal" min="0" step="0.1" value={editingLog.calories} onChange={(event) => updateLogNutrition("calories", Number(event.target.value))} /><span>千卡</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={editingLog.protein} onChange={(event) => updateLogNutrition("protein", Number(event.target.value))} /><span>g 蛋白</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={editingLog.carbs} onChange={(event) => updateLogNutrition("carbs", Number(event.target.value))} /><span>g 碳水</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={editingLog.fat} onChange={(event) => updateLogNutrition("fat", Number(event.target.value))} /><span>g 脂肪</span></label></div>
        <div className="result-details editable" aria-label="修改扩展营养">{extendedNutrients.map((item) => <label key={item.field}><span>{item.label}</span><div><input type="number" inputMode="decimal" min="0" step="0.1" value={editingLog[item.field]} onChange={(event) => updateLogNutrition(item.field, Number(event.target.value))} /><small>{item.unit}</small></div></label>)}</div>
        <p className="health-edit-note">如果这条已经同步到 Apple 健康，网页修改不会回改健康里的旧样本。</p>
        {ledgerMessage && <p className="ledger-editor-error" role="status">{ledgerMessage}</p>}
        <footer><button className="danger" type="button" disabled={ledgerBusy} aria-busy={ledgerActivity === "delete"} onClick={() => void deleteMeal()}>{ledgerActivity === "delete" ? "正在删除…" : "删除这条"}</button><button className="primary" disabled={ledgerBusy} aria-busy={ledgerActivity === "save"}>{ledgerActivity === "save" ? "正在保存…" : "保存修改"}</button></footer>
      </form>
    </div>}
    <section className="apple-health-bridge">
      <div><span>APPLE 健康</span><h3>桌面一点，增量同步今天</h3><p>运行一次会写入今天尚未同步且大于 0 的营养值；网络中断时请先到健康中核对，再决定是否重试。</p></div>
      <a className="primary" href={`shortcuts://run-shortcut?name=${encodeURIComponent("Tarelog Sync Today")}`}>同步今天新增</a>
    </section>
    <div className="gap-coach"><h3>与自定义目标的差距</h3><p>这里只做算术比较，不判断营养是否充足。</p><ul>{gapSummary.map((item) => <li key={item}>{item}</li>)}</ul></div>
  </section>;
}

const trendRanges = [
  { value: 7, label: "7 天" },
  { value: 30, label: "30 天" },
  { value: 90, label: "90 天" },
  { value: "all", label: "全部" },
] as const;

function LongTermTrends({ data }: { data: Bootstrap }) {
  const [range, setRange] = useState<7 | 30 | 90 | "all">(30);
  const history = data.history || [];
  const today = localDate(data.timeZone);
  const firstRecorded = history[0]?.mealDate || today;
  const start = range === "all" ? firstRecorded : shiftDate(today, -(range - 1));
  const byDate = new Map(history.map((day) => [day.mealDate, day]));
  const days: Array<DailyNutrition & { recorded: boolean }> = [];
  for (let date = start; date <= today; date = shiftDate(date, 1)) {
    const recorded = byDate.get(date);
    days.push(recorded ? { ...recorded, recorded: true } : { mealDate: date, entries: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, caffeine: 0, recorded: false });
  }
  const recordedDays = days.filter((day) => day.recorded);
  const divisor = recordedDays.length || 1;
  const averages = recordedDays.reduce((sum, day) => ({
    calories: sum.calories + day.calories,
    protein: sum.protein + day.protein,
    carbs: sum.carbs + day.carbs,
    fat: sum.fat + day.fat,
    fiber: sum.fiber + day.fiber,
    sugar: sum.sugar + day.sugar,
    saturatedFat: sum.saturatedFat + day.saturatedFat,
    sodium: sum.sodium + day.sodium,
    caffeine: sum.caffeine + day.caffeine,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, caffeine: 0 });
  const average = {
    calories: averages.calories / divisor,
    protein: averages.protein / divisor,
    carbs: averages.carbs / divisor,
    fat: averages.fat / divisor,
    fiber: averages.fiber / divisor,
    sugar: averages.sugar / divisor,
    saturatedFat: averages.saturatedFat / divisor,
    sodium: averages.sodium / divisor,
    caffeine: averages.caffeine / divisor,
  };
  const target = data.targetMacros;
  const nearTargetDays = target ? recordedDays.filter((day) => Math.abs(day.calories - target.kcal) / target.kcal <= .1).length : 0;
  const maxCalories = Math.max((target?.kcal || 0) * 1.2, ...recordedDays.map((day) => day.calories), 1);
  const chartWidth = Math.max(620, days.length * 13);
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));
  const recent = [...recordedDays].reverse().slice(0, 14);

  return <section className="admin-panel trends-panel">
    <div className="panel-intro"><p className="eyebrow">从第一笔记录开始</p><h2>长期趋势</h2><p>空白日期代表没有记录，不会被当作摄入为零；平均值只统计真正记过食物的日子。</p></div>
    <div className="range-switch" aria-label="统计时间范围">
      {trendRanges.map((item) => <button key={item.value} className={range === item.value ? "active" : ""} aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>)}
    </div>
    <div className="trend-summary">
      <article><span>有记录</span><strong>{recordedDays.length}<small> 天</small></strong><p>所选 {days.length} 个自然日中的真实记录</p></article>
      <article><span>日均能量</span><strong>{Math.round(average.calories)}<small> 千卡</small></strong><p>只按有记录日期计算</p></article>
      <article><span>目标附近</span><strong>{target ? <>{nearTargetDays}<small> 天</small></> : "未设置"}</strong><p>{target ? "热量在每日目标上下 10% 内" : "配置个人目标后才会计算"}</p></article>
    </div>
    <section className="calorie-history" aria-labelledby="calorie-history-title">
      <header><div><span>每日摄入</span><h3 id="calorie-history-title">热量与目标</h3></div><p><i /> 实际摄入 <b /> 每日目标</p></header>
      {recordedDays.length === 0 ? <div className="trend-empty"><strong>这个范围还没有记录</strong><p>之后每次“确认并记入今天”的食物都会自动累积到这里。</p></div> : <div className="chart-scroll"><div className="calorie-chart" role="img" aria-label={`从${shortDate(start)}到${shortDate(today)}的每日热量记录`} style={{ width: chartWidth }}>
        {target && <div className="target-line" style={{ bottom: `${Math.min(100, target.kcal / maxCalories * 100)}%` }}><span>{target.kcal} 千卡目标</span></div>}
        <div className="trend-bars">{days.map((day, index) => <div className={`trend-day ${day.recorded ? "recorded" : "missing"}`} key={day.mealDate} title={day.recorded ? `${shortDate(day.mealDate)}：${Math.round(day.calories)} 千卡` : `${shortDate(day.mealDate)}：未记录`}>
          <span className="trend-bar" style={{ "--bar-height": `${Math.max(day.recorded ? 2 : 0, day.calories / maxCalories * 100)}%` } as CSSProperties} />
          <small>{index % labelEvery === 0 || index === days.length - 1 ? shortDate(day.mealDate) : ""}</small>
        </div>)}</div>
      </div></div>}
    </section>
    <section className="macro-averages">
      <header><span>有记录日期的日均值</span><h3>宏量营养</h3></header>
      {([[
        "蛋白质", average.protein, target?.protein,
      ], ["碳水", average.carbs, target?.carbs], ["脂肪", average.fat, target?.fat]] as const).map(([label, value, nutrientTarget]) => <div key={label}><span>{label}</span><div><i style={{ width: `${nutrientTarget ? Math.min(100, value / nutrientTarget * 100) : 0}%` }} /></div><strong>{Math.round(value)}{nutrientTarget ? ` / ${nutrientTarget}g` : "g"}</strong></div>)}
    </section>
    <section className="extended-averages">
      <header><span>有记录日期的日均值</span><h3>纤维、糖、饱和脂肪、钠与咖啡因</h3></header>
      <div>{extendedNutrients.map((item) => <p key={item.field}><span>{item.label}</span><strong>{Math.round(average[item.field] * 10) / 10}</strong><small>{item.unit} / 日</small></p>)}</div>
    </section>
    <section className="history-list">
      <header><div><span>最近记录日</span><h3>每日汇总</h3></div><small>最多显示最近 14 个有记录日期</small></header>
      {recent.length === 0 ? <div className="trend-empty"><p>还没有可以汇总的记录。</p></div> : <ol>{recent.map((day) => <li key={day.mealDate}><time dateTime={day.mealDate}>{shortDate(day.mealDate)}</time><strong>{day.entries} 笔</strong><b>{Math.round(day.calories)} 千卡</b><span>蛋白 {Math.round(day.protein)}g</span><span>碳水 {Math.round(day.carbs)}g</span><span>脂肪 {Math.round(day.fat)}g</span></li>)}</ol>}
    </section>
  </section>;
}

function FoodEntry({ data, onRefresh }: { data: Bootstrap; onRefresh: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const [photoQueue, setPhotoQueue] = useState<QueuedPhoto[]>([]);
  const [photoBatchTotal, setPhotoBatchTotal] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [manualText, setManualText] = useState("");
  const [editingSaved, setEditingSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<"prepare" | "manual" | "analyze" | "match" | "save" | "">("");
  const [message, setMessage] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [savingItem, setSavingItem] = useState("");
  const currentPhoto = photoQueue[0];
  const file = currentPhoto?.file || null;
  const preview = currentPhoto?.preview || "";
  const photoPosition = file ? photoBatchTotal - photoQueue.length + 1 : 0;

  async function logQuickItem(item: QuickLogItem) {
    setSavingItem(item.id); setQuickMessage("");
    const response = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logMeal", mealType: item.mealType, ingredientName: item.name, grams: item.grams, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber, sugar: item.sugar, saturatedFat: item.saturatedFat, sodium: item.sodium, caffeine: item.caffeine }),
    });
    setSavingItem("");
    if (!response.ok) return setQuickMessage("这份记录没有记成功，请稍后再试。");
    setQuickMessage(`${item.name}已经记入今天。`); onRefresh();
  }

  async function compressPhoto(selected: File) {
    if (selected.size <= 850_000) return selected;
    const bitmap = await createImageBitmap(selected);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .78));
    return blob ? new File([blob], "food-photo.jpg", { type: "image/jpeg" }) : selected;
  }
  async function choose(selected: File[]) {
    const images = selected.filter((item) => item.type.startsWith("image/"));
    if (!images.length) return setMessage("请选择食物或包装照片。");
    setBusy(true); setActivity("prepare"); setMessage(`正在整理 ${images.length} 张照片…`);
    clearPhotoQueue(); setAnalysis(null); setEditingSaved(false);
    const prepared = await Promise.all(images.map(async (item) => {
      try { return await compressPhoto(item); } catch { return item; }
    }));
    const ready = prepared.map((item) => ({ file: item, preview: URL.createObjectURL(item) }));
    setPhotoQueue(ready); setPhotoBatchTotal(ready.length); setBusy(false); setActivity("");
    await analyzePhoto(ready[0].file, ready.length > 1 ? `已选择 ${ready.length} 张照片，正在识别第 1 张…` : "");
  }
  async function analyzePhoto(selected = file, progressMessage = "") {
    if (!selected) return;
    setBusy(true); setActivity("analyze"); setMessage(progressMessage);
    const body = new FormData(); body.append("image", selected);
    const response = await fetch("/api/analyze", { method: "POST", body });
    const result = await response.json() as { analysis?: Analysis; error?: string };
    setBusy(false); setActivity("");
    if (!response.ok || !result.analysis) return setMessage(result.error || "识别失败，请重拍。");
    setAnalysis(result.analysis); setEditingSaved(false); setMessage("");
  }
  function clearPhotoQueue() {
    photoQueue.forEach((item) => URL.revokeObjectURL(item.preview));
    setPhotoQueue([]); setPhotoBatchTotal(0);
  }
  function advancePhoto(doneMessage: string) {
    if (currentPhoto) URL.revokeObjectURL(currentPhoto.preview);
    const remaining = photoQueue.slice(1);
    setAnalysis(null); setEditingSaved(false); setPhotoQueue(remaining);
    if (!remaining.length) {
      setPhotoBatchTotal(0); setMessage(`${doneMessage} 本组照片已处理完。`);
      return;
    }
    const nextPosition = photoBatchTotal - remaining.length + 1;
    window.setTimeout(() => void analyzePhoto(remaining[0].file, `${doneMessage} 正在识别第 ${nextPosition} / ${photoBatchTotal} 张…`), 0);
  }
  async function analyzeManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualText.trim()) return setMessage("请先写食物名称，以及大约重量或热量。");
    setBusy(true); setActivity("manual"); setMessage("");
    const response = await fetch("/api/manual-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: manualText }),
    });
    const payload = await response.json() as { analysis?: Analysis; error?: string };
    setBusy(false); setActivity("");
    if (!response.ok || !payload.analysis) return setMessage(payload.error || "这句话还没算明白，请换一种写法。");
    clearPhotoQueue(); setAnalysis(payload.analysis); setEditingSaved(false);
    window.setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  function updateGrams(next: number) {
    setAnalysis((current) => {
      if (!current || !next) return current;
      const factor = next / current.grams;
      return { ...current, grams: next, calories: Math.round(current.calories * factor * 10) / 10, protein: Math.round(current.protein * factor * 10) / 10, carbs: Math.round(current.carbs * factor * 10) / 10, fat: Math.round(current.fat * factor * 10) / 10, fiber: Math.round(current.fiber * factor * 10) / 10, sugar: Math.round(current.sugar * factor * 10) / 10, saturatedFat: Math.round(current.saturatedFat * factor * 10) / 10, sodium: Math.round(current.sodium * factor * 10) / 10, caffeine: Math.round(current.caffeine * factor * 10) / 10 };
    });
  }
  function changeName(ingredientName: string) {
    if (!analysis) return;
    setAnalysis({ ...analysis, ingredientName, nutritionMatched: false, nutritionSource: "名称已更改，请重新联网匹配营养。", nutritionSourceUrl: undefined });
  }
  function updateMacro(field: "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "saturatedFat" | "sodium" | "caffeine", next: number) {
    if (!analysis || !Number.isFinite(next) || next < 0) return;
    setAnalysis({ ...analysis, [field]: next, nutritionMatched: true, nutritionSource: "手工修正", nutritionSourceUrl: undefined, estimatedFields: [] });
  }
  async function matchNutrition() {
    if (!analysis) return;
    setBusy(true); setActivity("match"); setMessage("");
    const response = await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientName: analysis.ingredientName, grams: analysis.grams }),
    });
    const payload = await response.json() as { nutrition?: Partial<Analysis>; error?: string };
    setBusy(false); setActivity("");
    if (!response.ok || !payload.nutrition) return setMessage(payload.error || "没有找到可靠的营养来源，你仍可手工填写。");
    setAnalysis({ ...analysis, ...payload.nutrition, nutritionMatched: true });
    setMessage("已按当前食材和重量匹配权威营养数据。");
  }
  function editSaved(item: Analysis) {
    clearPhotoQueue();
    setAnalysis({ ...item, detectedName: item.detectedName || item.ingredientName });
    setEditingSaved(true); setMessage("");
    window.setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  async function confirm(log = false) {
    if (!analysis) return;
    const confirmingPhoto = isPhotoResult && Boolean(currentPhoto);
    setBusy(true); setActivity("save"); setMessage("");
    const saveResponse = await fetch("/api/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveAnalysis", ...analysis }) });
    const saved = await saveResponse.json() as { error?: string };
    if (!saveResponse.ok) { setBusy(false); setActivity(""); return setMessage(saved.error || "修正没有保存成功，请再试一次。"); }
    if (log) {
      const logResponse = await fetch("/api/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logMeal", mealType: analysis.mealType || "加餐", ...analysis }) });
      if (!logResponse.ok) { setBusy(false); setActivity(""); return setMessage("修正已保存，但没有记入今天，请再点一次。"); }
    }
    setBusy(false); setActivity(""); setEditingSaved(false); setManualText("");
    if (confirmingPhoto) advancePhoto("这张已确认并记入今天。");
    else { setAnalysis(null); clearPhotoQueue(); setMessage(log ? "已确认并记入今天。" : "这次修正已经保存。"); }
    onRefresh();
  }

  function dismissAnalysis() {
    if (isPhotoResult && currentPhoto) return advancePhoto("这张已跳过，没有保存。");
    setAnalysis(null); setEditingSaved(false); clearPhotoQueue(); setMessage("已关闭，照片、识别结果和饮食记录都没有保存。");
  }

  const nutritionReady = Boolean(analysis?.nutritionMatched);
  const isPhotoResult = Boolean(analysis && !editingSaved && analysis.sourceType !== "manual");

  function renderAnalysisResult() {
    if (!analysis) return null;
    return <div className={`analysis-result ${isPhotoResult ? "photo-result" : ""}`} ref={result}>
      <div className="result-title"><div><span>{editingSaved ? "已保存记录 · 可继续修正" : analysis.sourceType === "manual" ? "文字补记 · 保存前确认" : analysis.sourceType === "package" ? "包装标签换算 · 保存前确认" : "食材识别 · 保存前确认"}</span><h3>{analysis.detectedName || analysis.ingredientName}</h3></div><b className={analysis.confidence >= .75 ? "good" : "warn"}>{Math.round(analysis.confidence * 100)}% 把握</b></div>
      <div className="result-form"><label>{analysis.sourceType === "package" ? "食品名称" : "食材名称"}<input value={analysis.ingredientName} onChange={(event) => changeName(event.target.value)} /></label><label>{analysis.sourceType === "package" ? "实际吃掉" : analysis.sourceType === "manual" ? "估算重量" : "电子秤读数"}<input type="number" inputMode="decimal" min="0" step="0.1" value={analysis.grams} onChange={(event) => updateGrams(Number(event.target.value))} /><em>{analysis.unit === "ml" ? "毫升" : "克"}</em></label></div>
      <p className="scale-raw">{analysis.sourceType === "manual" ? "输入原文" : analysis.sourceType === "package" ? "标签原文" : "秤面原文"}：{analysis.scaleText || "未读清"} {analysis.note ? `· ${analysis.note}` : ""}</p>
      <div className="result-macros editable" aria-label="可手工修正的营养数值"><label><input type="number" inputMode="decimal" min="0" step="0.1" value={analysis.calories} onChange={(event) => updateMacro("calories", Number(event.target.value))} /><span>千卡</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={analysis.protein} onChange={(event) => updateMacro("protein", Number(event.target.value))} /><span>g 蛋白</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={analysis.carbs} onChange={(event) => updateMacro("carbs", Number(event.target.value))} /><span>g 碳水</span></label><label><input type="number" inputMode="decimal" min="0" step="0.1" value={analysis.fat} onChange={(event) => updateMacro("fat", Number(event.target.value))} /><span>g 脂肪</span></label></div>
      <div className="result-details editable" aria-label="可手工修正的扩展营养数值">{extendedNutrients.map((item) => <label key={item.field}><span>{item.label}</span><div><input type="number" inputMode="decimal" min="0" step="0.1" value={analysis[item.field]} onChange={(event) => updateMacro(item.field, Number(event.target.value))} /><small>{item.unit}</small></div></label>)}</div>
      {Boolean(analysis.estimatedFields?.length) && <p className="estimate-note">估算项：{analysis.estimatedFields?.join("、")}。可直接在上方修改后保存。</p>}
      <div className={`nutrition-source-line ${analysis.nutritionMatched ? "source-ok" : "source-warn"}`}><p>{analysis.nutritionSourceUrl ? <a href={analysis.nutritionSourceUrl} target="_blank" rel="noreferrer">{analysis.nutritionSource}</a> : analysis.nutritionSource}</p><button className="secondary" onClick={matchNutrition} disabled={busy} aria-busy={activity === "match"}>{activity === "match" ? "正在联网匹配…" : "重新联网匹配营养"}</button></div>
      <p className={`result-action-note ${nutritionReady ? "" : "needs-nutrition"}`}>{editingSaved ? "保存只更新识别记录，不会重复记入今天。" : nutritionReady ? "确认前不会保存照片、识别结果或今日总账。" : "请先匹配营养，或手工填写热量。"}</p>
      <div className="result-actions">{editingSaved ? <button className="primary" onClick={() => confirm(false)} disabled={busy} aria-busy={activity === "save"}>{activity === "save" ? "正在保存…" : "保存修改"}</button> : <><button className="secondary" onClick={dismissAnalysis} disabled={busy}>关闭，不记录</button><button className="primary" onClick={() => confirm(true)} disabled={busy || !nutritionReady} aria-busy={activity === "save"}>{activity === "save" ? "正在记入…" : "确认并记入今天"}</button></>}</div>
    </div>;
  }

  return <section className="admin-panel analyzer-panel">
    <div className="panel-intro"><p className="eyebrow">记录食物</p><h2>照片识别</h2><p>一次可选多张。照片仅用于识别，不会存进 Tarelog。</p></div>
    <div className="photo-workbench">
      <div className={`photo-drop ${preview ? "has-photo" : ""}`} onClick={() => !busy && input.current?.click()} role="button" tabIndex={0} aria-label="添加食物照片，可一次选择多张" aria-disabled={busy} onKeyDown={(event) => event.key === "Enter" && !busy && input.current?.click()}>
        <input ref={input} type="file" accept="image/*" multiple disabled={busy} onChange={(event) => { const selected = Array.from(event.currentTarget.files || []); event.currentTarget.value = ""; void choose(selected); }} hidden />
        {preview ? <Image src={preview} alt={`第 ${photoPosition} 张待识别的食材或食品包装`} fill sizes="(max-width: 900px) 100vw, 55vw" unoptimized /> : <><span className="camera-icon">◎</span><strong>添加食物照片</strong><p>相机或图库 · 可一次多选 · 每张 8MB 以内</p></>}
        <div className="corner one" /><div className="corner two" /><div className="corner three" /><div className="corner four" />
      </div>
      {file && photoBatchTotal > 1 && <div className="photo-queue-status" aria-live="polite"><strong>第 {photoPosition} / {photoBatchTotal} 张</strong><span>{analysis ? "等待你确认" : activity === "analyze" ? "正在识别并匹配营养" : `后面还有 ${photoQueue.length - 1} 张`}</span></div>}
      {file && <button type="button" className="primary photo-action" onClick={() => void analyzePhoto()} disabled={busy} aria-busy={activity === "analyze"}>{activity === "analyze" ? "正在识别并匹配营养…" : analysis ? "重新识别当前照片" : "识别当前照片"}</button>}
    </div>
    {isPhotoResult && renderAnalysisResult()}
    {message && <div className="toast-note" role="status">{message}</div>}
    {data.quickLogItems.length > 0 && <section className="quick-log-dock" aria-labelledby="quick-log-title">
      <header><span>常用快捷</span><h3 id="quick-log-title">点一下直接记入今天</h3><small className="quick-log-scroll-hint">左右滑动查看更多</small></header>
      <div>{data.quickLogItems.map((item) => <button key={item.id} disabled={Boolean(savingItem)} aria-busy={savingItem === item.id} onClick={() => void logQuickItem(item)}><span>{item.serving}</span><strong>{item.name}</strong><small>{savingItem === item.id ? "正在记录…" : `${Math.round(item.calories)} 千卡`}</small></button>)}</div>
      {quickMessage && <p className="quick-log-message" role="status">{quickMessage}</p>}
    </section>}
    <form className="manual-entry" onSubmit={analyzeManual}>
      <div><span>文字补记</span><h3>一句话记下刚才吃的</h3><p>写下食物和大概重量或热量。</p></div>
      <label><span>你记得什么就写什么</span><textarea rows={3} value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="例如：鸡腿肉 300 多卡" maxLength={160} /></label>
      <button className="primary" disabled={busy} aria-busy={activity === "manual"}>{activity === "manual" ? "正在匹配并计算…" : "自动估算，进入确认"}</button>
    </form>
    {!isPhotoResult && renderAnalysisResult()}
    {(data.analyses || []).length > 0 && <div className="recent-list"><h3>识别与补记记录</h3>{(data.analyses || []).map((item) => <div key={item.id}><span>{item.ingredientName}{!item.nutritionMatched && <i>待补营养</i>}</span><b>{item.grams}{item.unit === "ml" ? "ml" : "g"}</b><small>{Math.round(item.calories)} kcal</small><button className="secondary" onClick={() => editSaved(item)}>查看并修正</button></div>)}</div>}
  </section>;
}

function AdminView({ data, refresh }: { data: Bootstrap; refresh: () => void }) {
  const [tab, setTab] = useState<(typeof adminTabs)[number]>("今日营养");
  const icon = (item: (typeof adminTabs)[number]) => item === "今日营养" ? "◔" : item === "长期趋势" ? "↗" : "◎";
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="brand"><span>TL</span><strong>Tarelog</strong></div><nav aria-label="主导航">{adminTabs.map((item) => <button key={item} className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}><i aria-hidden="true">{icon(item)}</i>{item}</button>)}</nav></aside><div className="admin-main">{tab === "今日营养" && <NutritionDashboard data={data} onRefresh={refresh} />}{tab === "记录食物" && <FoodEntry data={data} onRefresh={refresh} />}{tab === "长期趋势" && <LongTermTrends data={data} />}</div><nav className="mobile-admin-nav" aria-label="主导航">{adminTabs.map((item) => <button key={item} className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}><i aria-hidden="true">{icon(item)}</i><span>{item}</span></button>)}</nav></main>;
}

export default function KitchenApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const loaded = useRef(false);

  async function load(quiet = false) {
    if (!quiet) setError("");
    const response = await fetch("/api/kitchen");
    const result = await response.json() as Bootstrap & { error?: string };
    if (response.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!response.ok) { setData(null); setError(result.error || "饮食记录暂时没有加载成功。"); return; }
    setData(result);
  }

  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    window.setTimeout(() => void load(), 0);
  }, []);

  if (!data) return <main className="loading-page"><div><span>TL</span><h1>{error || "正在加载饮食记录…"}</h1>{error && <button className="secondary" onClick={() => void load()}>重新加载</button>}</div></main>;
  return <AdminView data={data} refresh={() => load(true)} />;
}
