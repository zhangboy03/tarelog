export const nutrientFields = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "sodium", "caffeine"] as const;
export type NutrientField = (typeof nutrientFields)[number];

type HealthRow = { id: string } & Record<NutrientField, number>;

export function pendingHealthNutrients<T extends HealthRow>(rows: T[], completed: Set<string>) {
  return Object.fromEntries(nutrientFields.map((field) => [
    field,
    rows.filter((row) => Number(row[field]) > 0 && !completed.has(row.id) && !completed.has(`${row.id}:${field}`)),
  ])) as Record<NutrientField, T[]>;
}
