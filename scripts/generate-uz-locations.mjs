import fs from "node:fs";
import path from "node:path";

const STAT_UZ_URL = "https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_2414.json";
const OUTPUT_PATH = path.join(process.cwd(), "data", "uzbekistan-locations.json");

function normalizeName(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

async function main() {
  const response = await fetch(STAT_UZ_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch stat.uz data: ${response.status}`);
  }

  const payload = await response.json();
  const rows = payload?.[0]?.data ?? [];

  const regions = rows
    .filter((row) => String(row.Code).length === 4 && String(row.Code) !== "1700")
    .map((regionRow) => {
      const districts = rows
        .filter((item) => String(item.Code).length === 7 && String(item.Code).startsWith(String(regionRow.Code)))
        .map((item) => ({ code: String(item.Code), name: normalizeName(item.Klassifikator) }))
        .sort((a, b) => a.name.localeCompare(b.name, "uz"));

      return {
        code: String(regionRow.Code),
        name: normalizeName(regionRow.Klassifikator),
        districts,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "uz"));

  const output = {
    source: STAT_UZ_URL,
    sourceNote: "stat.uz SDMX dataset (id: 2414)",
    generatedAt: new Date().toISOString(),
    regions,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Saved ${regions.length} regions to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
