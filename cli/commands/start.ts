/**
 * rho start — Launch the heartbeat daemon.
 *
 * Starts a background monitor process that:
 * - holds a wake lock on Android
 * - ensures a tmux session named 'rho' exists running `pi -c`
 * - shows a persistent notification on Android
 * - cleans up wake lock + notification when stopped
 */

import * as os from "node:os";
import * as path from "node:path";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { detectPlatform } from "../init-core.ts";
import { parseInitToml } from "../config.ts";
import {
  SESSION_NAME,
  PID_FILE,
  planStart,
  buildNotificationArgs,
  notificationToCliArgs,
  type DaemonState,
} from "../daemon-core.ts";

const HOME = process.env.HOME || os.homedir();
const RHO_DIR = path.join(HOME, ".rho");
const PID_PATH = path.join(HOME, PID_FILE);
const INIT_TOML = path.join(RHO_DIR, "init.toml");

function tmuxSessionExists(): boolean {
  const r = spawnSync("tmux", ["has-session", "-t", SESSION_NAME], { stdio: "ignore" });
  return r.status === 0;
}

function readDaemonPid(): number | null {
  try {
    const content = readFileSync(PID_PATH, "utf-8").trim();
    const pid = parseInt(content, 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getInterval(): string {
  try {
    if (existsSync(INIT_TOML)) {
      const config = parseInitToml(readFileSync(INIT_TOML, "utf-8"));
      const interval = (config.settings as any)?.heartbeat?.interval;
      if (typeof interval === "string") return interval;
    }
  } catch {
    // ignore
  }
  return "30m";
}

function getCommandPath(cmd: string): string | null {
  const r = spawnSync("sh", ["-lc", `command -v ${cmd}`], { encoding: "utf-8" });
  if (r.status !== 0) return null;
  const out = (r.stdout || "").trim();
  return out || null;
}

function acquireWakeLock(): void {
  try {
    spawnSync("termux-wake-lock", [], { stdio: "ignore" });
  } catch {
    // non-fatal
  }
}

function releaseWakeLock(): void {
  try {
    spawnSync("termux-wake-unlock", [], { stdio: "ignore" });
  } catch {
    // non-fatal
  }
}

function showNotification(interval: string): void {
  const notifBin = getCommandPath("termux-notification");
  if (!notifBin) return;

  const tmuxBin = getCommandPath("tmux") || "tmux";

  try {
    const notif = buildNotificationArgs(tmuxBin, interval);
    const cliArgs = notificationToCliArgs(notif);
    spawnSync("termux-notification", cliArgs, { stdio: "ignore" });
  } catch {
    // non-fatal
  }
}

function removeNotification(): void {
  const rmBin = getCommandPath("termux-notification-remove");
  if (!rmBin) return;

  try {
    spawnSync("termux-notification-remove", ["rho-daemon"], { stdio: "ignore" });
  } catch {
    // non-fatal
  }
}

function ensureTmuxSession(): void {
  if (tmuxSessionExists()) return;

  const r = spawnSync(
    "tmux",
    ["new-session", "-d", "-s", SESSION_NAME, "-c", HOME, "pi -c"],
    { stdio: "ignore" },
  );
  if (r.status !== 0) {
    throw new Error("Failed to create tmux session");
  }
}

async function monitorLoop(): Promise<void> {
  const platform = detectPlatform();

  writeFileSync(PID_PATH, String(process.pid));

  if (platform === "android") {
    acquireWakeLock();
    showNotification(getInterval());
  }

  const cleanup = () => {
    try { unlinkSync(PID_PATH); } catch {}
    if (platform === "android") {
      removeNotification();
      releaseWakeLock();
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.on("exit", cleanup);

  try {
    ensureTmuxSession();
  } catch {
    cleanup();
    process.exit(1);
  }

  while (true) {
    await sleep(30_000);
    if (!tmuxSessionExists()) {
      try {
        ensureTmuxSession();
      } catch {
        cleanup();
        process.exit(1);
      }
    }
  }
}

export async function run(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`rho start

Launch the Rho heartbeat daemon in a tmux session.

Starts a background monitor process that keeps the tmux session alive.
On Android, it also holds a wake lock and shows a persistent notification.

Options:
  --foreground   Attach to the session after starting
  --monitor      (internal) Run the background monitor loop
  -h, --help     Show this help`);
    return;
  }

  const foreground = args.includes("--foreground") || args.includes("-f");
  const monitorMode = args.includes("--monitor");

  if (monitorMode) {
    await monitorLoop();
    return;
  }

  const platform = detectPlatform();

  // Clean up stale PID file.
  const existingPid = readDaemonPid();
  if (existingPid !== null && !pidAlive(existingPid)) {
    try { unlinkSync(PID_PATH); } catch {}
  }

  const state: DaemonState = {
    tmuxRunning: tmuxSessionExists(),
    daemonPid: readDaemonPid(),
    daemonPidAlive: false,
    platform,
  };

  const plan = planStart(state, HOME);

  if (plan.tmuxAlreadyRunning) {
    if (foreground) {
      spawnSync("tmux", ["attach", "-t", plan.sessionName], { stdio: "inherit" });
    } else {
      console.log("Rho already running.");
      console.log(`Attach with: tmux attach -t ${plan.sessionName}`);
    }
    return;
  }

  const indexPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.ts");
  const child = spawn(process.execPath, [
    "--experimental-strip-types",
    indexPath,
    "start",
    "--monitor",
  ], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();

  await sleep(1000);

  if (!tmuxSessionExists()) {
    console.error("Failed to start rho daemon (tmux session not found).");
    process.exit(1);
  }

  console.log(`Rho running in tmux session: ${plan.sessionName}`);

  if (foreground) {
    spawnSync("tmux", ["attach", "-t", plan.sessionName], { stdio: "inherit" });
  } else {
    console.log(`Attach with: tmux attach -t ${plan.sessionName}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
