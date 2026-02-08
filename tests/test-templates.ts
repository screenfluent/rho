/**
 * Tests for templates/init.toml and templates/packages.toml
 * Verifies templates parse with smol-toml and contain correct defaults.
 * Run: npx tsx tests/test-templates.ts
 */

// ---- Test harness ----
let PASS = 0;
let FAIL = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    PASS++;
  } else {
    console.error(`  FAIL: ${label}`);
    FAIL++;
  }
}

function assertEq(actual: unknown, expected: unknown, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  PASS: ${label}`);
    PASS++;
  } else {
    console.error(`  FAIL: ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    FAIL++;
  }
}

// ---- Imports ----
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { REGISTRY, type ModuleEntry } from "../cli/registry.ts";
import { parseInitToml, parsePackagesToml } from "../cli/config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

// ---- Helpers ----
function readTemplate(name: string): string {
  return readFileSync(resolve(TEMPLATES_DIR, name), "utf-8");
}

// ===== init.toml tests =====
console.log("\n=== templates/init.toml ===\n");

// -- File existence --
let initContent: string;
try {
  initContent = readTemplate("init.toml");
  console.log(`  PASS: init.toml exists`);
  PASS++;
} catch {
  console.error(`  FAIL: init.toml does not exist`);
  FAIL++;
  process.exit(1);
}

// -- Raw TOML parsing --
let initRaw: any;
try {
  initRaw = parseToml(initContent);
  console.log(`  PASS: init.toml parses as valid TOML`);
  PASS++;
} catch (e: any) {
  console.error(`  FAIL: init.toml TOML parse error — ${e.message}`);
  FAIL++;
  process.exit(1);
}

// -- Parses with our config parser --
let initConfig: ReturnType<typeof parseInitToml>;
try {
  initConfig = parseInitToml(initContent);
  console.log(`  PASS: init.toml parses with parseInitToml`);
  PASS++;
} catch (e: any) {
  console.error(`  FAIL: init.toml parseInitToml error — ${e.message}`);
  FAIL++;
  process.exit(1);
}

// -- Agent section --
assert(typeof initConfig.agent.name === "string", "agent.name is a string");
assert(initConfig.agent.name.length > 0, "agent.name is non-empty");
assertEq(initConfig.agent.name, "rho", "agent.name defaults to 'rho'");

// -- All registry modules present --
const registryByCategory: Record<string, string[]> = {};
for (const [name, entry] of Object.entries(REGISTRY)) {
  if (!registryByCategory[entry.category]) registryByCategory[entry.category] = [];
  registryByCategory[entry.category].push(name);
}

for (const [category, modules] of Object.entries(registryByCategory)) {
  const configCategory = initConfig.modules[category as keyof typeof initConfig.modules];
  assert(configCategory !== undefined, `modules.${category} section exists`);
  for (const mod of modules) {
    assert(
      configCategory !== undefined && mod in configCategory,
      `modules.${category}.${mod} is present`
    );
    assertEq(
      configCategory?.[mod],
      true,
      `modules.${category}.${mod} defaults to true`
    );
  }
}

// -- No extra modules --
const allRegistryNames = new Set(Object.keys(REGISTRY));
const allConfigModules: string[] = [];
for (const category of Object.values(initConfig.modules)) {
  allConfigModules.push(...Object.keys(category));
}
for (const mod of allConfigModules) {
  assert(allRegistryNames.has(mod), `config module '${mod}' exists in registry`);
}
assertEq(allConfigModules.length, Object.keys(REGISTRY).length, "same number of modules as registry");

// -- Settings section exists --
assert(initConfig.settings !== undefined, "settings section exists");
assert("heartbeat" in initConfig.settings, "settings.heartbeat is present");
assert("interval" in initConfig.settings.heartbeat, "settings.heartbeat.interval is present");
assertEq(initConfig.settings.heartbeat.interval, "30m", "heartbeat interval defaults to 30m");

// -- Comments present (check raw content) --
assert(initContent.includes("# Rho Configuration"), "has header comment");
assert(initContent.includes("rho sync"), "mentions rho sync");
assert(initContent.includes("# "), "has inline comments");

// Count comment lines to ensure it's "heavily commented"
const commentLines = initContent.split("\n").filter(l => l.trimStart().startsWith("#")).length;
assert(commentLines >= 15, `has >= 15 comment lines (found ${commentLines})`);

// -- Core modules have descriptions as comments --
for (const [name, entry] of Object.entries(REGISTRY)) {
  // Each module line should have the description as an inline comment
  const pattern = new RegExp(`${name}\\s*=\\s*true\\s+#.*${entry.description.slice(0, 20)}`);
  assert(pattern.test(initContent), `${name} has description comment`);
}

// ===== packages.toml tests =====
console.log("\n=== templates/packages.toml ===\n");

// -- File existence --
let pkgContent: string;
try {
  pkgContent = readTemplate("packages.toml");
  console.log(`  PASS: packages.toml exists`);
  PASS++;
} catch {
  console.error(`  FAIL: packages.toml does not exist`);
  FAIL++;
  process.exit(1);
}

// -- Raw TOML parsing --
let pkgRaw: any;
try {
  pkgRaw = parseToml(pkgContent);
  console.log(`  PASS: packages.toml parses as valid TOML`);
  PASS++;
} catch (e: any) {
  console.error(`  FAIL: packages.toml TOML parse error — ${e.message}`);
  FAIL++;
  process.exit(1);
}

// -- Parses with our config parser --
let pkgConfig: ReturnType<typeof parsePackagesToml>;
try {
  pkgConfig = parsePackagesToml(pkgContent);
  console.log(`  PASS: packages.toml parses with parsePackagesToml`);
  PASS++;
} catch (e: any) {
  console.error(`  FAIL: packages.toml parsePackagesToml error — ${e.message}`);
  FAIL++;
  process.exit(1);
}

// -- Default is empty packages --
assertEq(pkgConfig.packages.length, 0, "default packages list is empty");

// -- Has helpful comments --
assert(pkgContent.includes("# "), "packages.toml has comments");
assert(pkgContent.includes("rho sync"), "mentions rho sync");
assert(pkgContent.includes("npm:"), "has npm example in comments");

const pkgCommentLines = pkgContent.split("\n").filter(l => l.trimStart().startsWith("#")).length;
assert(pkgCommentLines >= 5, `has >= 5 comment lines (found ${pkgCommentLines})`);

// ===== Summary =====
console.log(`\n--- ${PASS} passed, ${FAIL} failed ---`);
process.exit(FAIL > 0 ? 1 : 0);
