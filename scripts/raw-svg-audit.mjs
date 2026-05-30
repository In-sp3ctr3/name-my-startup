import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src/app", "src/components"];
const failures = [];

function walk(dir) {
  try {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) return walk(full);
      if (!/\.(tsx|ts|jsx|js)$/.test(full)) return [];
      return [full];
    });
  } catch {
    return [];
  }
}

for (const scanRoot of scanRoots) {
  for (const file of walk(path.join(root, scanRoot))) {
    const relative = path.relative(root, file);
    const text = readFileSync(file, "utf8");
    if (/<svg[\s>]/i.test(text) || /dangerouslySetInnerHTML/i.test(text)) {
      failures.push(relative);
    }
  }
}

if (failures.length > 0) {
  console.error("Raw SVG or dangerouslySetInnerHTML found:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Raw SVG audit passed.");
