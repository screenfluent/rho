Feature: /tasks -- lightweight task queue
  As a rho user
  I want to capture and track tasks from within my agent session
  So that I don't lose track of things and heartbeat can surface them

  Background:
    Given rho is installed and running
    And the tasks store at ~/.rho/tasks.jsonl exists (or will be created)

  # ---------------------------------------------------------------------------
  # Adding tasks
  # ---------------------------------------------------------------------------

  Scenario: Add a task with default priority
    When the LLM calls tasks(action="add", description="Fix the login bug")
    Then a new task should be persisted to ~/.rho/tasks.jsonl
    And the task should have status "pending"
    And the task should have priority "normal"
    And the task should have a unique ID
    And the task should have a created timestamp

  Scenario: Add a task with priority
    When the LLM calls tasks(action="add", description="Ship v1", priority="high")
    Then the task priority should be "high"

  Scenario: Add a task with due date
    When the LLM calls tasks(action="add", description="Write blog post", due="2026-02-10")
    Then the task should have due "2026-02-10"

  Scenario: Add a task with tags
    When the LLM calls tasks(action="add", description="Refactor auth", tags="code,rho")
    Then the task tags should be ["code", "rho"]

  Scenario: Add a task with empty description fails
    When the LLM calls tasks(action="add", description="")
    Then the tool should return an error mentioning "description"

  # ---------------------------------------------------------------------------
  # Listing tasks
  # ---------------------------------------------------------------------------

  Scenario: List pending tasks (default)
    Given 3 pending tasks and 1 done task exist
    When the LLM calls tasks(action="list")
    Then the result should show 3 pending tasks
    And done tasks should not appear

  Scenario: List all tasks including done
    Given 3 pending tasks and 1 done task exist
    When the LLM calls tasks(action="list", filter="all")
    Then the result should show 4 tasks

  Scenario: List tasks filtered by tag
    Given a task tagged "code" and a task tagged "writing"
    When the LLM calls tasks(action="list", filter="code")
    Then only the task tagged "code" should appear

  Scenario: List tasks when none exist
    Given the tasks store is empty
    When the LLM calls tasks(action="list")
    Then the result should say "No pending tasks"

  Scenario: List orders by priority then creation date
    Given tasks with priorities urgent, low, and high
    When the LLM calls tasks(action="list")
    Then urgent should appear first, then high, then low

  # ---------------------------------------------------------------------------
  # Completing tasks
  # ---------------------------------------------------------------------------

  Scenario: Mark a task as done
    Given a pending task with ID "abc123"
    When the LLM calls tasks(action="done", id="abc123")
    Then the task status should be "done"
    And the task should have a completedAt timestamp
    And the result should confirm completion

  Scenario: Complete a nonexistent task
    When the LLM calls tasks(action="done", id="nonexistent")
    Then the tool should return an error mentioning "not found"

  Scenario: Complete an already-done task
    Given a task with ID "abc123" that is already done
    When the LLM calls tasks(action="done", id="abc123")
    Then the tool should return a message that it's already done

  # ---------------------------------------------------------------------------
  # Removing tasks
  # ---------------------------------------------------------------------------

  Scenario: Remove a task
    Given a pending task with ID "abc123"
    When the LLM calls tasks(action="remove", id="abc123")
    Then the task should no longer appear in the store
    And the result should confirm removal

  Scenario: Remove a nonexistent task
    When the LLM calls tasks(action="remove", id="nonexistent")
    Then the tool should return an error mentioning "not found"

  # ---------------------------------------------------------------------------
  # Slash command
  # ---------------------------------------------------------------------------

  Scenario: /tasks shows pending tasks
    Given 2 pending tasks exist
    When the user types "/tasks"
    Then a notification should show the pending task count and summaries

  Scenario: /tasks add creates a task
    When the user types "/tasks add Fix the flaky test"
    Then a new pending task "Fix the flaky test" should be created
    And a notification should confirm the addition

  Scenario: /tasks done completes a task by partial ID
    Given a pending task with ID "abc123def"
    When the user types "/tasks done abc1"
    Then the task should be marked done
    And a notification should confirm completion

  Scenario: /tasks clear removes all done tasks
    Given 2 done tasks and 1 pending task
    When the user types "/tasks clear"
    Then the 2 done tasks should be removed
    And the 1 pending task should remain

  # ---------------------------------------------------------------------------
  # Heartbeat integration
  # ---------------------------------------------------------------------------

  Scenario: Heartbeat includes pending tasks in prompt
    Given 2 pending tasks exist
    When the rho heartbeat fires
    Then the heartbeat prompt should include a "Pending tasks" section
    And each pending task description should appear in the prompt

  Scenario: Overdue tasks flagged in heartbeat
    Given a task with due date in the past
    When the rho heartbeat fires
    Then the heartbeat prompt should flag the task as "OVERDUE"

  Scenario: No tasks means no tasks section in heartbeat
    Given the tasks store is empty
    When the rho heartbeat fires
    Then the heartbeat prompt should not include a "Pending tasks" section

  # ---------------------------------------------------------------------------
  # Persistence
  # ---------------------------------------------------------------------------

  Scenario: Tasks survive across sessions
    Given tasks were added in a previous session
    When a new session starts
    Then the previously added tasks should be loadable

  Scenario: Concurrent writes don't corrupt the store
    Given two rapid task additions
    Then both tasks should be persisted correctly
    And the JSONL file should have valid JSON on each line

  # ---------------------------------------------------------------------------
  # Edge cases
  # ---------------------------------------------------------------------------

  Scenario: Unknown action returns error
    When the LLM calls tasks(action="bogus")
    Then the tool should return an error mentioning "Unknown action"

  Scenario: Task ID uses short random string
    When a task is added
    Then the ID should be 8 characters of hex
    And it should be unique among existing tasks
