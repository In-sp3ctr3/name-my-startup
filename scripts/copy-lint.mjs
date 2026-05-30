import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "tests"];
const ignoredFiles = new Set(["src/lib/legal-language.ts", "tests/unit/legal-language.test.ts"]);
const prohibited = [
  /legally available/i,
  /trademark clear/i,
  /safe to use/i,
  /no conflicts/i,
  /guaranteed unique/i,
  /\bapproved\b/i,
  /\bcleared\b/i,
  /\bprotected\b/i,
  /\bregistrable\b/i,
  /\benforceable\b/i,
  /green checkmarks/i,
  /approval badges/i,
  /winner-style/i
];

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (!/\.(ts|tsx|md|mjs)$/.test(full)) return [];
    return [full];
  });
}

const failures = [];
for (const scanRoot of scanRoots) {
  for (const full of walk(path.join(root, scanRoot))) {
    const relative = path.relative(root, full);
    if (ignoredFiles.has(relative)) continue;
    const text = readFileSync(full, "utf8");
    for (const pattern of prohibited) {
      if (pattern.test(text)) {
        failures.push(`${relative}: ${pattern}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Prohibited legal-certainty or approval-like language found:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Copy guardrail scan passed.");
