// HTTP handler coverage only. This fixture does not generate or persist an Excel export.
export async function exportNutritionMenu() {
  return { downloadUrl: "https://dinhduong2598.food/fixture-export-not-a-real-file", filename: "Fixture-not-a-real-export.xlsx", expiresAt: new Date(Date.now() + 600_000).toISOString() };
}
// Serial-slot stub only; actual PostgreSQL contention is checked on the VPS.
export async function withNutritionWorkbookSlot<T>(build: () => Promise<T>): Promise<T> { return build(); }
