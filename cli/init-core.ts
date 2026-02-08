/**
 * cli/init-core.ts — Pure init logic, no filesystem IO.
 *
 * Generates config file contents, plans init operations,
 * detects platform. All functions are pure and testable
 * (except detectPlatform which reads process.env/os).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform as osPlatform } from "node:os";

// ---- Types ----

export type Platform = "android" | "macos" | "linux";

export interface InitPlan {
  name: string;
  rhoDir: string;
  platform: Platform;
  filesToCreate: Map<string, string>;
  dirsToCreate: string[];
  existingConfigs: string[];
}

export interface PlanInitInput {
  name: string;
  rhoDir: string;
  existingFiles: Set<string>;
}

// ---- Paths ----

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");
const SOUL_TEMPLATE = resolve(__dirname, "..", "SOUL.md.template");

// ---- Config files that init manages ----

const CONFIG_FILES = ["init.toml", "packages.toml", "SOUL.md"] as const;
const DATA_DIRS = ["brain", "vault"] as const;

// ---- Platform detection ----

/**
 * Detect the current platform.
 * Checks for Termux/Android environment variables first,
 * then falls back to os.platform().
 */
export function detectPlatform(): Platform {
  // Termux / Android detection
  if (
    process.env.ANDROID_ROOT ||
    process.env.PREFIX?.includes("com.termux")
  ) {
    return "android";
  }

  const p = osPlatform();
  if (p === "darwin") return "macos";
  return "linux"; // Default to linux for all other unix-like
}

// ---- Template generation ----

/**
 * Generate init.toml content with the agent name substituted.
 * Reads the template file and replaces the placeholder name.
 */
export function generateInitToml(name: string): string {
  const template = readFileSync(resolve(TEMPLATES_DIR, "init.toml"), "utf-8");
  // Replace the default name "rho" in the agent.name field
  // The template has: name = "rho"
  return template.replace(
    /^(name\s*=\s*)"rho"/m,
    `$1"${escapeTomlString(name)}"`,
  );
}

/**
 * Generate SOUL.md content with the agent name substituted.
 * Reads the SOUL.md.template and replaces {{NAME}} placeholders.
 */
export function generateSoulMd(name: string): string {
  const template = readFileSync(SOUL_TEMPLATE, "utf-8");
  return template.replace(/\{\{NAME\}\}/g, name);
}

/**
 * Generate packages.toml content. Currently just returns the template as-is
 * since it has no name-dependent content.
 */
function generatePackagesToml(): string {
  return readFileSync(resolve(TEMPLATES_DIR, "packages.toml"), "utf-8");
}

// ---- Plan ----

/**
 * Plan the init operation. Pure function that determines what files
 * to create and what directories to ensure exist.
 *
 * Never overwrites existing files — only creates missing ones.
 */
export function planInit(input: PlanInitInput): InitPlan {
  const { name, rhoDir, existingFiles } = input;

  const filesToCreate = new Map<string, string>();
  const existingConfigs: string[] = [];

  // Generate each config file if not already present
  if (!existingFiles.has("init.toml")) {
    filesToCreate.set("init.toml", generateInitToml(name));
  } else {
    existingConfigs.push("init.toml");
  }

  if (!existingFiles.has("packages.toml")) {
    filesToCreate.set("packages.toml", generatePackagesToml());
  } else {
    existingConfigs.push("packages.toml");
  }

  if (!existingFiles.has("SOUL.md")) {
    filesToCreate.set("SOUL.md", generateSoulMd(name));
  } else {
    existingConfigs.push("SOUL.md");
  }

  // Data directories are always in the plan (mkdir -p is idempotent)
  const dirsToCreate = [...DATA_DIRS];

  return {
    name,
    rhoDir,
    platform: detectPlatform(),
    filesToCreate,
    dirsToCreate,
    existingConfigs,
  };
}

// ---- Helpers ----

/**
 * Escape a string for use in a TOML quoted string value.
 * Handles backslashes and quotes.
 */
function escapeTomlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
