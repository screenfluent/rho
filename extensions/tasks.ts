/**
 * Tasks Extension -- lightweight task queue for rho
 *
 * Provides a `/tasks` slash command and `tasks` tool for capturing,
 * tracking, and completing tasks. Tasks persist to ~/.rho/tasks.jsonl
 * and are surfaced during heartbeat check-ins.
 *
 * Usage:
 *   /tasks              -- Show pending tasks
 *   /tasks add <desc>   -- Add a task
 *   /tasks done <id>    -- Mark task complete (prefix match)
 *   /tasks clear        -- Remove all completed tasks
 *   /tasks all          -- Show all tasks including done
 *
 * The LLM can also use the tasks tool directly:
 *   tasks(action="add", description="...", priority?, due?, tags?)
 *   tasks(action="list", filter?)
 *   tasks(action="done", id="...")
 *   tasks(action="remove", id="...")
 *   tasks(action="clear")
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

import {
  addTask,
  listTasks,
  completeTask,
  removeTask,
  clearDone,
  buildHeartbeatSection,
  loadTasks,
  TASKS_PATH,
  type TaskPriority,
} from "./tasks-core.ts";

export default function (pi: ExtensionAPI) {
  // Skip in subagent mode (heartbeat subagent doesn't need this)
  if (process.env.RHO_SUBAGENT === "1") return;

  // ---- Tool registration ----

  pi.registerTool({
    name: "tasks",
    label: "Tasks",
    description:
      "Lightweight task queue. Actions: add (create task), list (show tasks), done (complete task), remove (delete task), clear (remove all done tasks). " +
      "Tasks persist across sessions and are surfaced during heartbeat check-ins.",
    parameters: Type.Object({
      action: StringEnum(["add", "list", "done", "remove", "clear"] as const),
      description: Type.Optional(
        Type.String({ description: "Task description (for add action)" })
      ),
      id: Type.Optional(
        Type.String({ description: "Task ID or prefix (for done/remove actions)" })
      ),
      priority: Type.Optional(
        Type.String({ description: "Priority: urgent, high, normal, low (default: normal)" })
      ),
      due: Type.Optional(
        Type.String({ description: "Due date in YYYY-MM-DD format" })
      ),
      tags: Type.Optional(
        Type.String({ description: "Comma-separated tags (e.g. 'code,rho')" })
      ),
      filter: Type.Optional(
        Type.String({
          description:
            "Filter for list: 'pending' (default), 'all', 'done', or a tag name",
        })
      ),
    }),

    async execute(_toolCallId, params) {
      switch (params.action) {
        case "add": {
          const result = addTask({
            description: params.description || "",
            priority: params.priority as TaskPriority | undefined,
            due: params.due,
            tags: params.tags,
          });
          return {
            content: [{ type: "text", text: result.message }],
            details: { action: "add", ok: result.ok, task: result.task },
          };
        }

        case "list": {
          const result = listTasks(params.filter);
          return {
            content: [{ type: "text", text: result.message }],
            details: {
              action: "list",
              ok: result.ok,
              count: result.count,
            },
          };
        }

        case "done": {
          const result = completeTask(params.id || "");
          return {
            content: [{ type: "text", text: result.message }],
            details: { action: "done", ok: result.ok, task: result.task },
          };
        }

        case "remove": {
          const result = removeTask(params.id || "");
          return {
            content: [{ type: "text", text: result.message }],
            details: {
              action: "remove",
              ok: result.ok,
              task: result.task,
            },
          };
        }

        case "clear": {
          const result = clearDone();
          return {
            content: [{ type: "text", text: result.message }],
            details: {
              action: "clear",
              ok: result.ok,
              count: result.count,
            },
          };
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: "Error: Unknown action. Use: add, list, done, remove, clear",
              },
            ],
            details: { error: true },
          };
      }
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("tasks ")) + theme.fg("muted", args.action);
      if (args.description) {
        const desc =
          args.description.length > 50
            ? args.description.slice(0, 47) + "..."
            : args.description;
        text += " " + theme.fg("accent", desc);
      }
      if (args.id) {
        text += " " + theme.fg("accent", args.id);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as
        | { action: string; ok: boolean; count?: number }
        | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (!details.ok) {
        const text = result.content[0];
        return new Text(
          theme.fg("error", text?.type === "text" ? text.text : "Error"),
          0,
          0
        );
      }

      if (details.action === "list") {
        if (details.count === 0) {
          return new Text(theme.fg("dim", "No pending tasks."), 0, 0);
        }
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      const text = result.content[0];
      return new Text(
        theme.fg("success", ">> ") +
          (text?.type === "text" ? text.text : ""),
        0,
        0
      );
    },
  });

  // ---- Slash command ----

  pi.registerCommand("tasks", {
    description:
      "Task queue: /tasks (list), /tasks add <desc>, /tasks done <id>, /tasks clear, /tasks all",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const subcmd = parts[0] || "";
      const rest = parts.slice(1).join(" ");

      switch (subcmd) {
        case "":
        case "list": {
          const result = listTasks("pending");
          if (result.count === 0) {
            ctx.ui.notify("No pending tasks.", "info");
          } else {
            ctx.ui.notify(result.message, "info");
          }
          break;
        }

        case "all": {
          const result = listTasks("all");
          if (result.count === 0) {
            ctx.ui.notify("No tasks.", "info");
          } else {
            ctx.ui.notify(result.message, "info");
          }
          break;
        }

        case "add": {
          if (!rest.trim()) {
            ctx.ui.notify("Usage: /tasks add <description>", "warning");
            return;
          }
          const result = addTask({ description: rest });
          if (result.ok) {
            ctx.ui.notify(result.message, "success");
          } else {
            ctx.ui.notify(result.message, "error");
          }
          break;
        }

        case "done": {
          if (!rest.trim()) {
            ctx.ui.notify("Usage: /tasks done <id>", "warning");
            return;
          }
          const result = completeTask(rest.trim());
          if (result.ok) {
            ctx.ui.notify(result.message, "success");
          } else {
            ctx.ui.notify(result.message, "error");
          }
          break;
        }

        case "remove":
        case "rm": {
          if (!rest.trim()) {
            ctx.ui.notify("Usage: /tasks remove <id>", "warning");
            return;
          }
          const result = removeTask(rest.trim());
          if (result.ok) {
            ctx.ui.notify(result.message, "success");
          } else {
            ctx.ui.notify(result.message, "error");
          }
          break;
        }

        case "clear": {
          const result = clearDone();
          ctx.ui.notify(result.message, result.ok ? "success" : "error");
          break;
        }

        default:
          ctx.ui.notify(
            "Usage: /tasks [add <desc> | done <id> | remove <id> | clear | all]",
            "warning"
          );
      }
    },
  });

  // ---- Heartbeat integration ----
  // Expose a function that rho.ts can call to get the tasks section for heartbeat prompts.
  // Since rho.ts builds the prompt, we hook into it by writing to a known location.
  // Alternative: export and import. But since pi loads each extension independently,
  // we just provide the function via a file-based contract.

  // The simplest integration: rho.ts will import buildHeartbeatSection from tasks-core.ts
  // No additional wiring needed here -- the function is already exported from tasks-core.ts.
}
