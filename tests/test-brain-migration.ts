/**
 * Tests for brain-migration.ts
 * Run: npx tsx tests/test-brain-migration.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  detectMigrationWithPaths,
  runMigrationWithPaths,
  type MigrationPaths,
} from "../extensions/lib/brain-migration.ts";

import {
  readBrain,
  foldBrain,
  appendBrainEntry,
} from "../extensions/lib/brain-store.ts";

// ── Test harness ──────────────────────────────────────────────────

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

function assertEq<T>(actual: T, expected: T, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS: ${label}`);
    PASS++;
  } else {
    console.error(`  FAIL: ${label} -- expected ${e}, got ${a}`);
    FAIL++;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = path.join(
    os.tmpdir(),
    `brain-migration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makePaths(dir: string): MigrationPaths {
  return {
    brainPath: path.join(dir, "brain.jsonl"),
    legacyCore: path.join(dir, "core.jsonl"),
    legacyMemory: path.join(dir, "memory.jsonl"),
    legacyContext: path.join(dir, "context.jsonl"),
    legacyTasks: path.join(dir, "tasks.jsonl"),
  };
}

function writeLines(filePath: string, entries: any[]): void {
  fs.writeFileSync(filePath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Tests ─────────────────────────────────────────────────────────

async function testDetect_NoLegacyFiles() {
  console.log("\n── detectMigration: no legacy files → hasLegacy=false");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    const status = detectMigrationWithPaths(paths);
    assertEq(status.hasLegacy, false, "hasLegacy is false");
    assertEq(status.alreadyMigrated, false, "alreadyMigrated is false");
    assertEq(status.legacyFiles.length, 0, "no legacy files listed");
  } finally {
    cleanup(dir);
  }
}

async function testDetect_LegacyCoreExists() {
  console.log("\n── detectMigration: legacy core.jsonl → hasLegacy=true");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
    ]);
    const status = detectMigrationWithPaths(paths);
    assertEq(status.hasLegacy, true, "hasLegacy is true");
    assertEq(status.legacyFiles.length, 1, "one legacy file");
    assert(status.legacyFiles[0] === paths.legacyCore, "file is core.jsonl");
  } finally {
    cleanup(dir);
  }
}

async function testDetect_EmptyLegacyFileNotCounted() {
  console.log("\n── detectMigration: empty legacy file not counted");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    fs.writeFileSync(paths.legacyCore, "");
    fs.writeFileSync(paths.legacyContext, "\n\n");
    const status = detectMigrationWithPaths(paths);
    assertEq(status.hasLegacy, false, "empty files → hasLegacy=false");
    assertEq(status.legacyFiles.length, 0, "no legacy files listed");
  } finally {
    cleanup(dir);
  }
}

async function testDetect_AlreadyMigrated() {
  console.log("\n── detectMigration: meta marker present → alreadyMigrated=true");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    // Write a migration marker into brain.jsonl
    await appendBrainEntry(paths.brainPath, {
      id: "meta001",
      type: "meta",
      key: "migration.v2",
      value: "done",
      created: new Date().toISOString(),
    });
    // Even with legacy files present, should report already migrated
    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
    ]);
    const status = detectMigrationWithPaths(paths);
    assertEq(status.hasLegacy, true, "hasLegacy is true");
    assertEq(status.alreadyMigrated, true, "alreadyMigrated is true");
  } finally {
    cleanup(dir);
  }
}

async function testDetect_SkipMarker() {
  console.log("\n── detectMigration: meta marker 'skip' → alreadyMigrated=true");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    await appendBrainEntry(paths.brainPath, {
      id: "meta002",
      type: "meta",
      key: "migration.v2",
      value: "skip",
      created: new Date().toISOString(),
    });
    const status = detectMigrationWithPaths(paths);
    assertEq(status.alreadyMigrated, true, "skip value also counts as migrated");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_CoreBehaviors() {
  console.log("\n── runMigration: core.jsonl behaviors imported");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
      { id: "b-2", type: "behavior", category: "dont", text: "Hedge excessively", created: "2024-01-01" },
      { id: "b-3", type: "behavior", category: "value", text: "Clarity over diplomacy", created: "2024-01-01" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.behaviors, 3, "3 behaviors migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.behaviors.length, 3, "3 behaviors in brain");
    assert(brain.behaviors.some((b) => b.text === "Be direct" && b.category === "do"), "do behavior present");
    assert(brain.behaviors.some((b) => b.text === "Hedge excessively" && b.category === "dont"), "dont behavior present");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_CoreIdentityAndUser() {
  console.log("\n── runMigration: core.jsonl identity + user imported");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [
      { id: "id-1", type: "identity", key: "name", value: "rho", created: "2024-01-01" },
      { id: "u-1", type: "user", key: "name", value: "Mikey", created: "2024-01-01" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.identity, 1, "1 identity migrated");
    assertEq(stats.user, 1, "1 user migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.identity.get("name")?.value, "rho", "identity value");
    assertEq(brain.user.get("name")?.value, "Mikey", "user value");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_MemoryLearnings() {
  console.log("\n── runMigration: memory.jsonl learnings imported (legacy fields stripped)");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyMemory, [
      { id: "l-1", type: "learning", text: "Use tsx for TypeScript", used: 5, last_used: "2024-06-01", created: "2024-01-01" },
      { id: "l-2", type: "learning", text: "Check exit codes", used: 0, last_used: "2024-01-01", created: "2024-02-01" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.learnings, 2, "2 learnings migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.learnings.length, 2, "2 learnings in brain");
    assert(brain.learnings.some((l) => l.text === "Use tsx for TypeScript"), "first learning present");
    assert(brain.learnings.some((l) => l.source === "migration"), "source set to migration");
    // Ensure legacy fields are NOT present
    const raw = entries.find((e) => e.type === "learning") as any;
    assertEq(raw?.used, undefined, "legacy 'used' field not carried over");
    assertEq(raw?.last_used, undefined, "legacy 'last_used' field not carried over");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_MemoryPreferences() {
  console.log("\n── runMigration: memory.jsonl preferences imported");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyMemory, [
      { id: "p-1", type: "preference", category: "Communication", text: "User name: Mikey", created: "2024-01-01" },
      { id: "p-2", type: "preference", text: "Dark mode", created: "2024-01-01" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.preferences, 2, "2 preferences migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.preferences.length, 2, "2 preferences in brain");
    assert(brain.preferences.some((p) => p.category === "Communication"), "category preserved");
    assert(brain.preferences.some((p) => p.category === "General"), "missing category defaults to General");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_Tasks() {
  console.log("\n── runMigration: tasks.jsonl tasks imported");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyTasks, [
      { id: "t-1", description: "Build review extension", status: "pending", priority: "normal", tags: ["pi"], created: "2024-01-01T00:00:00Z", due: null, completedAt: null },
      { id: "t-2", description: "Fix bug", status: "done", priority: "high", tags: [], created: "2024-01-01T00:00:00Z", due: "2024-02-01", completedAt: "2024-01-15T00:00:00Z" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.tasks, 2, "2 tasks migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.tasks.length, 2, "2 tasks in brain");
    const t1 = brain.tasks.find((t) => t.description === "Build review extension");
    assert(!!t1, "first task present");
    assertEq(t1?.id, "t-1", "task id preserved from legacy");
    assertEq(t1?.tags?.[0], "pi", "task tags preserved");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_TasksMinimalFields() {
  console.log("\n── runMigration: tasks with minimal fields get defaults");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    // Legacy task with just description and id
    writeLines(paths.legacyTasks, [
      { id: "t-min", description: "Minimal task" },
    ]);
    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.tasks, 1, "1 task migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    const t = brain.tasks.find((t) => t.description === "Minimal task");
    assert(!!t, "task present");
    assertEq(t?.status, "pending", "default status = pending");
    assertEq(t?.priority, "normal", "default priority = normal");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_DuplicatesSkipped() {
  console.log("\n── runMigration: duplicates skipped (idempotent)");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
    ]);
    writeLines(paths.legacyMemory, [
      { id: "l-1", type: "learning", text: "Use tsx", used: 0, last_used: "2024-01-01", created: "2024-01-01" },
      { id: "p-1", type: "preference", category: "Code", text: "TypeScript preferred", created: "2024-01-01" },
    ]);
    writeLines(paths.legacyTasks, [
      { id: "t-1", description: "Do stuff", status: "pending", priority: "normal", tags: [], created: "2024-01-01T00:00:00Z", due: null, completedAt: null },
    ]);

    // First migration
    const stats1 = await runMigrationWithPaths(paths);
    assertEq(stats1.behaviors, 1, "first run: 1 behavior");
    assertEq(stats1.learnings, 1, "first run: 1 learning");
    assertEq(stats1.preferences, 1, "first run: 1 preference");
    assertEq(stats1.tasks, 1, "first run: 1 task");

    // Second migration — everything should be skipped except new meta marker
    // Need to clear the migration marker first to allow re-run
    // (In practice, detectMigration would prevent this, but runMigration doesn't check)
    const stats2 = await runMigrationWithPaths(paths);
    assertEq(stats2.behaviors, 0, "second run: 0 behaviors (deduped)");
    assertEq(stats2.learnings, 0, "second run: 0 learnings (deduped)");
    assertEq(stats2.preferences, 0, "second run: 0 preferences (deduped)");
    assertEq(stats2.tasks, 0, "second run: 0 tasks (deduped)");
    assert(stats2.skipped >= 4, "second run: at least 4 skipped");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_MetaMarkerWritten() {
  console.log("\n── runMigration: meta marker written");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    // Even with no legacy files, migration writes the marker
    await runMigrationWithPaths(paths);

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.meta.get("migration.v2")?.value, "done", "migration marker present");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_LegacyFilesUntouched() {
  console.log("\n── runMigration: legacy files untouched after migration");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    const coreContent = JSON.stringify({ id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" }) + "\n";
    const tasksContent = JSON.stringify({ id: "t-1", description: "Do stuff", status: "pending", priority: "normal", tags: [], created: "2024-01-01T00:00:00Z", due: null, completedAt: null }) + "\n";

    fs.writeFileSync(paths.legacyCore, coreContent);
    fs.writeFileSync(paths.legacyTasks, tasksContent);

    // Record mtimes
    const coreMtime = fs.statSync(paths.legacyCore).mtimeMs;
    const tasksMtime = fs.statSync(paths.legacyTasks).mtimeMs;

    // Small delay to ensure different mtime if files were written
    await new Promise((r) => setTimeout(r, 50));

    await runMigrationWithPaths(paths);

    // Verify legacy files were not modified
    assertEq(fs.readFileSync(paths.legacyCore, "utf-8"), coreContent, "core.jsonl content unchanged");
    assertEq(fs.readFileSync(paths.legacyTasks, "utf-8"), tasksContent, "tasks.jsonl content unchanged");
    assertEq(fs.statSync(paths.legacyCore).mtimeMs, coreMtime, "core.jsonl mtime unchanged");
    assertEq(fs.statSync(paths.legacyTasks).mtimeMs, tasksMtime, "tasks.jsonl mtime unchanged");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_MixedAllTypes() {
  console.log("\n── runMigration: all file types together");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
      { id: "id-1", type: "identity", key: "name", value: "rho", created: "2024-01-01" },
      { id: "u-1", type: "user", key: "name", value: "Mikey", created: "2024-01-01" },
    ]);
    writeLines(paths.legacyMemory, [
      { id: "l-1", type: "learning", text: "Use tsx", used: 0, last_used: "2024-01-01", created: "2024-01-01" },
      { id: "p-1", type: "preference", category: "Code", text: "TypeScript", created: "2024-01-01" },
    ]);
    writeLines(paths.legacyContext, [
      { id: "ctx-1", type: "context", project: "myapp", path: "/home/user/myapp", content: "Node.js project", created: "2024-01-01" },
    ]);
    writeLines(paths.legacyTasks, [
      { id: "t-1", description: "Ship feature", status: "pending", priority: "high", tags: ["release"], created: "2024-01-01T00:00:00Z", due: "2024-03-01", completedAt: null },
    ]);

    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.behaviors, 1, "1 behavior");
    assertEq(stats.identity, 1, "1 identity");
    assertEq(stats.user, 1, "1 user");
    assertEq(stats.learnings, 1, "1 learning");
    assertEq(stats.preferences, 1, "1 preference");
    assertEq(stats.contexts, 1, "1 context");
    assertEq(stats.tasks, 1, "1 task");
    assertEq(stats.skipped, 0, "0 skipped");

    // Verify materialized brain
    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    // 7 data entries + 1 meta marker
    assertEq(entries.length, 8, "8 entries total (7 data + 1 meta)");
    assertEq(brain.meta.get("migration.v2")?.value, "done", "migration marker");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_PreexistingBrainNotOverwritten() {
  console.log("\n── runMigration: pre-existing brain.jsonl entries preserved");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);

    // Pre-populate brain.jsonl with one behavior
    await appendBrainEntry(paths.brainPath, {
      id: "existing-1",
      type: "behavior",
      category: "value",
      text: "Pre-existing value",
      created: "2023-01-01",
    });

    writeLines(paths.legacyCore, [
      { id: "b-1", type: "behavior", category: "do", text: "Be direct", created: "2024-01-01" },
    ]);

    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.behaviors, 1, "1 new behavior migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.behaviors.length, 2, "both old and new behaviors present");
    assert(brain.behaviors.some((b) => b.text === "Pre-existing value"), "pre-existing entry preserved");
    assert(brain.behaviors.some((b) => b.text === "Be direct"), "migrated entry present");
  } finally {
    cleanup(dir);
  }
}

async function testDetect_MultipleLegacyFiles() {
  console.log("\n── detectMigration: multiple legacy files detected");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    writeLines(paths.legacyCore, [{ id: "b-1", type: "behavior", category: "do", text: "x", created: "2024-01-01" }]);
    writeLines(paths.legacyMemory, [{ id: "l-1", type: "learning", text: "y", used: 0, last_used: "2024-01-01", created: "2024-01-01" }]);
    writeLines(paths.legacyTasks, [{ id: "t-1", description: "z", status: "pending", priority: "normal", tags: [], created: "2024-01-01T00:00:00Z", due: null, completedAt: null }]);

    const status = detectMigrationWithPaths(paths);
    assertEq(status.hasLegacy, true, "hasLegacy=true");
    assertEq(status.legacyFiles.length, 3, "3 legacy files found");
  } finally {
    cleanup(dir);
  }
}

async function testMigrate_MalformedLinesSkipped() {
  console.log("\n── runMigration: malformed JSON lines in legacy files skipped");
  const dir = makeTmpDir();
  try {
    const paths = makePaths(dir);
    // Write a mix of valid and invalid lines
    const content = [
      JSON.stringify({ id: "b-1", type: "behavior", category: "do", text: "Valid", created: "2024-01-01" }),
      "this is not json",
      "{broken json",
      JSON.stringify({ id: "b-2", type: "behavior", category: "dont", text: "Also valid", created: "2024-01-01" }),
    ].join("\n") + "\n";
    fs.writeFileSync(paths.legacyCore, content);

    const stats = await runMigrationWithPaths(paths);
    assertEq(stats.behaviors, 2, "only valid entries migrated");

    const { entries } = readBrain(paths.brainPath);
    const brain = foldBrain(entries);
    assertEq(brain.behaviors.length, 2, "2 behaviors in brain");
  } finally {
    cleanup(dir);
  }
}

// ── Run all ───────────────────────────────────────────────────────

async function main() {
  console.log("=== brain-migration tests ===\n");

  await testDetect_NoLegacyFiles();
  await testDetect_LegacyCoreExists();
  await testDetect_EmptyLegacyFileNotCounted();
  await testDetect_AlreadyMigrated();
  await testDetect_SkipMarker();
  await testDetect_MultipleLegacyFiles();

  await testMigrate_CoreBehaviors();
  await testMigrate_CoreIdentityAndUser();
  await testMigrate_MemoryLearnings();
  await testMigrate_MemoryPreferences();
  await testMigrate_Tasks();
  await testMigrate_TasksMinimalFields();
  await testMigrate_DuplicatesSkipped();
  await testMigrate_MetaMarkerWritten();
  await testMigrate_LegacyFilesUntouched();
  await testMigrate_MixedAllTypes();
  await testMigrate_PreexistingBrainNotOverwritten();
  await testMigrate_MalformedLinesSkipped();

  console.log(`\n=== Results: ${PASS} passed, ${FAIL} failed ===`);
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
