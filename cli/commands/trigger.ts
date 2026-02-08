/**
 * rho trigger — Force an immediate heartbeat check-in.
 *
 * Sends the `/rho now` command to the running tmux session.
 * Starts the daemon if not running.
 */

import { spawnSync } from "node:child_process";

import { SESSION_NAME } from "../daemon-core.ts";

function tmuxSessionExists(): boolean {
  const r = spawnSync("tmux", ["has-session", "-t", SESSION_NAME], { stdio: "ignore" });
  return r.status === 0;
}

export async function run(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`rho trigger

Force an immediate heartbeat check-in.

Sends '/rho now' to the running tmux session. If the daemon
is not running, starts it first.

Options:
  -h, --help   Show this help`);
    return;
  }

  if (!tmuxSessionExists()) {
    console.log("Rho not running. Starting...");
    const { run: startRun } = await import("./start.ts");
    await startRun([]);

    // Give tmux/pi a moment to initialize.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (!tmuxSessionExists()) {
      console.error("Failed to start rho daemon.");
      process.exit(1);
    }
  }

  // Send check-in command
  const r = spawnSync("tmux", ["send-keys", "-t", SESSION_NAME, "/rho now", "Enter"], { stdio: "ignore" });
  if (r.status !== 0) {
    console.error("Failed to trigger check-in.");
    process.exit(1);
  }

  console.log("Heartbeat check-in triggered.");

  // Show tmux display message if possible
  spawnSync("tmux", ["display-message", "-t", SESSION_NAME, "Rho check-in triggered"], { stdio: "ignore" });
}
