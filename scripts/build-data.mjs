import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import xlsx from "xlsx";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = resolve(root, "data/Malaysian Food.xlsx");
const out = resolve(root, "src/data/dishes.json");

const clean = (v) =>
  typeof v === "string"
    ? v.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
    : "";

const wb = xlsx.read(readFileSync(src), { type: "buffer" });
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
  defval: "",
});

const dishes = rows
  .map((r) => ({
    name: clean(r["Name"]),
    type: clean(r["Type"]),
    origin: clean(r["Origin/Popularity"]),
    description: clean(r["Description"]),
  }))
  .filter((d) => d.name && d.name !== "#VALUE!");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(dishes, null, 2) + "\n");

console.log(`Wrote ${dishes.length} dishes to ${out}`);
