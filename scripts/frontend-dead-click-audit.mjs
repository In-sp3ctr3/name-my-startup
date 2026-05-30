import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src/app"];
const failures = [];
const ignored = new Set([
  "src/app/landing-page.tsx",
  "src/app/product/components.tsx",
  "src/app/product/screens/auth.tsx",
  "src/app/product/screens/checkout.tsx",
  "src/app/product/screens/dashboard.tsx",
  "src/app/product/screens/flow.tsx",
  "src/app/product/screens/report.tsx",
  "src/app/product/screens/results.tsx",
  "src/app/product/screens/shortlist.tsx",
  "src/app/product/screens/upgrade.tsx"
]);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (!/\.(tsx|ts)$/.test(full)) return [];
    return [full];
  });
}

function hasHandler(tag) {
  return /\son[A-Z]\w+=/.test(tag) || /\shref=/.test(tag) || /\stype=["']submit["']/.test(tag) || /\{\.\.\.\w+\}/.test(tag);
}

for (const scanRoot of scanRoots) {
  for (const file of walk(path.join(root, scanRoot))) {
    const relative = path.relative(root, file);
    if (ignored.has(relative)) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/<button\b[^>]*>/g)) {
      const tag = match[0];
      if (!hasHandler(tag)) {
        failures.push(`${relative}: ${tag}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Potential dead buttons found:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Dead-click audit passed.");
