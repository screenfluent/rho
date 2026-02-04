/**
 * Usage Bars Extension - CodexBar-style usage widget for pi
 *
 * Shows Codex (OpenAI) and Anthropic (Claude) API usage bars
 * as a persistent widget above the editor. Polls OAuth APIs
 * using tokens from ~/.pi/agent/auth.json.
 *
 * Only shows the bar for the currently active provider.
 *
 * Inspired by steipete/CodexBar.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const AUTH_FILE = path.join(os.homedir(), ".pi", "agent", "auth.json");
const POLL_INTERVAL_MS = 2 * 60 * 1000;
const BAR_WIDTH = 20;

interface AuthData {
  "openai-codex"?: { access?: string; refresh?: string };
  anthropic?: { access?: string; refresh?: string };
}

interface CodexUsage {
  plan_type?: string;
  rate_limit?: {
    primary_window?: { used_percent: number; reset_after_seconds: number };
    secondary_window?: { used_percent: number; reset_after_seconds: number };
  };
}

interface ClaudeUsage {
  five_hour?: { utilization: number; resets_at: string };
  seven_day?: { utilization: number; resets_at: string };
  extra_usage?: { is_enabled: boolean; monthly_limit: number; used_credits: number };
}

interface UsageState {
  codex: { session: number; weekly: number; error?: string } | null;
  claude: { session: number; weekly: number; extraSpend?: number; extraLimit?: number; error?: string } | null;
  lastPoll: number;
  activeProvider: "codex" | "claude" | null;
}

function readAuth(): AuthData | null {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  } catch {
    return null;
  }
}

async function fetchCodexUsage(token: string): Promise<UsageState["codex"]> {
  try {
    const res = await fetch("https://chatgpt.com/backend-api/wham/usage", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { session: 0, weekly: 0, error: `HTTP ${res.status}` };
    const data = (await res.json()) as CodexUsage;
    return {
      session: data.rate_limit?.primary_window?.used_percent ?? 0,
      weekly: data.rate_limit?.secondary_window?.used_percent ?? 0,
    };
  } catch (e) {
    return { session: 0, weekly: 0, error: String(e) };
  }
}

async function fetchClaudeUsage(token: string): Promise<UsageState["claude"]> {
  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
    });
    if (!res.ok) return { session: 0, weekly: 0, error: `HTTP ${res.status}` };
    const data = (await res.json()) as ClaudeUsage;
    const result: NonNullable<UsageState["claude"]> = {
      session: data.five_hour?.utilization ?? 0,
      weekly: data.seven_day?.utilization ?? 0,
    };
    if (data.extra_usage?.is_enabled) {
      result.extraSpend = data.extra_usage.used_credits;
      result.extraLimit = data.extra_usage.monthly_limit;
    }
    return result;
  } catch (e) {
    return { session: 0, weekly: 0, error: String(e) };
  }
}

function renderBar(pct: number, width: number, fillFn: (s: string) => string, emptyFn: (s: string) => string): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return fillFn("█".repeat(filled)) + emptyFn("░".repeat(empty));
}

function barColor(pct: number, theme: any): (s: string) => string {
  if (pct >= 80) return (s: string) => theme.fg("error", s);
  if (pct >= 50) return (s: string) => theme.fg("warning", s);
  return (s: string) => theme.fg("success", s);
}

function detectProvider(model: { provider?: string; id?: string } | undefined | null): "codex" | "claude" | null {
  if (!model) return null;
  const p = (model.provider || "").toLowerCase();
  const id = (model.id || "").toLowerCase();
  if (p.includes("openai") || p.includes("codex") || id.includes("gpt") || id.includes("codex")) return "codex";
  if (p.includes("anthropic") || id.includes("claude")) return "claude";
  if (p.includes("google") || p.includes("antigravity")) {
    if (id.includes("claude")) return "claude";
  }
  return null;
}

export default function (pi: ExtensionAPI) {
  const state: UsageState = { codex: null, claude: null, lastPoll: 0, activeProvider: null };
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let ctx: any = null;

  async function poll() {
    const auth = readAuth();
    if (!auth) return;
    const promises: Promise<void>[] = [];
    if (auth["openai-codex"]?.access) {
      promises.push(fetchCodexUsage(auth["openai-codex"].access).then((r) => { state.codex = r; }));
    }
    if (auth.anthropic?.access) {
      promises.push(fetchClaudeUsage(auth.anthropic.access).then((r) => { state.claude = r; }));
    }
    await Promise.allSettled(promises);
    state.lastPoll = Date.now();
    updateWidget();
  }

  function updateWidget() {
    if (ctx) {
      ctx.ui.setWidget("usage-bars", (_tui: any, theme: any) => ({
        render: () => renderWidget(theme),
        invalidate: () => {},
      }));
    }
  }

  function renderProviderLine(
    label: string,
    data: { session: number; weekly: number; error?: string; extraSpend?: number; extraLimit?: number },
    theme: any,
  ): string {
    const dimFn = (s: string) => theme.fg("dim", s);
    const emptyFn = (s: string) => theme.fg("dim", s);
    if (data.error) return ` ${theme.fg("muted", label)} ${theme.fg("error", data.error)}`;
    const sFill = barColor(data.session, theme);
    const wFill = barColor(data.weekly, theme);
    const sBar = renderBar(data.session, BAR_WIDTH, sFill, emptyFn);
    const wBar = renderBar(data.weekly, BAR_WIDTH, wFill, emptyFn);
    let line = ` ${theme.fg("muted", label)} 5h ${sBar} ${dimFn(String(data.session).padStart(3) + "%")}  7d ${wBar} ${dimFn(String(data.weekly).padStart(3) + "%")}`;
    if (data.extraSpend !== undefined && data.extraLimit !== undefined) {
      line += `  ${dimFn("$" + data.extraSpend.toFixed(0) + "/" + data.extraLimit)}`;
    }
    return line;
  }

  function renderWidget(theme: any): string[] {
    const active = state.activeProvider;
    if (active === "codex" && state.codex) return [renderProviderLine("Codex ", state.codex, theme)];
    if (active === "claude" && state.claude) return [renderProviderLine("Claude", state.claude, theme)];
    if (state.codex && !state.claude) return [renderProviderLine("Codex ", state.codex, theme)];
    if (state.claude && !state.codex) return [renderProviderLine("Claude", state.claude, theme)];
    if (state.codex && state.claude) {
      return [renderProviderLine("Codex ", state.codex, theme), renderProviderLine("Claude", state.claude, theme)];
    }
    return [];
  }

  function updateProvider(_ctx: any) {
    const prev = state.activeProvider;
    state.activeProvider = detectProvider(_ctx.model);
    if (prev !== state.activeProvider) updateWidget();
  }

  pi.on("session_start", async (_event, _ctx) => {
    ctx = _ctx;
    updateProvider(_ctx);
    await poll();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => poll(), POLL_INTERVAL_MS);
  });

  pi.on("turn_start", async (_event, _ctx) => {
    ctx = _ctx;
    updateProvider(_ctx);
  });

  pi.registerCommand("usage", {
    description: "Refresh API usage bars",
    handler: async (_args, _ctx) => {
      ctx = _ctx;
      updateProvider(_ctx);
      await poll();
      _ctx.ui.notify("Usage refreshed", "info");
    },
  });
}
