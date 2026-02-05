Feature: Smart heartbeat routing -- use cheapest model for heartbeat check-ins
  As a rho user
  I want heartbeat check-ins to use the cheapest available model
  So that I don't waste expensive tokens on routine status checks

  Background:
    Given rho is running with a heartbeat enabled
    And the user's primary session model is "anthropic/claude-opus-4-5" ($75/M output)
    And auth is configured for multiple providers

  # ---------------------------------------------------------------------------
  # Core: cheapest model resolution
  # ---------------------------------------------------------------------------

  Scenario: Heartbeat resolves cheapest model across all providers
    Given the following models have valid auth:
      | provider           | model                  | output_cost |
      | anthropic          | claude-opus-4-5        | $75.00      |
      | anthropic          | claude-3-5-haiku       | $1.25       |
      | google-antigravity | gpt-oss-120b-medium    | $0.36       |
    When the heartbeat fires
    Then rho should resolve the cheapest model: "google-antigravity/gpt-oss-120b-medium"
    And the spawned pi command should include "--provider google-antigravity --model gpt-oss-120b-medium"

  Scenario: Heartbeat skips models without valid auth
    Given the following models exist:
      | provider   | model              | output_cost | has_auth |
      | anthropic  | claude-opus-4-5    | $75.00      | yes      |
      | anthropic  | claude-3-5-haiku   | $1.25       | yes      |
      | xai        | grok-3-mini-fast   | $0.10       | no       |
    When the heartbeat fires
    Then rho should resolve "anthropic/claude-3-5-haiku" (cheapest with auth)
    And the spawned pi command should include "--provider anthropic --model claude-3-5-haiku-latest"

  Scenario: Heartbeat falls back to session model when resolution fails
    Given ctx.modelRegistry is unavailable or throws an error
    When the heartbeat fires
    Then rho should spawn pi WITHOUT --provider/--model flags
    And the heartbeat should still execute normally

  # ---------------------------------------------------------------------------
  # Thinking disabled for heartbeat
  # ---------------------------------------------------------------------------

  Scenario: Heartbeat disables thinking to minimize cost
    When the heartbeat fires
    And the resolved model supports thinking (e.g., claude-3-7-sonnet)
    Then the spawned pi command should include "--thinking off"

  # ---------------------------------------------------------------------------
  # Configuration: manual model override
  # ---------------------------------------------------------------------------

  Scenario: User overrides heartbeat model via /rho command
    When I run "/rho model anthropic/claude-3-5-haiku-latest"
    Then the heartbeat model should be set to "anthropic/claude-3-5-haiku-latest"
    And subsequent heartbeats should use that model instead of auto-resolving
    And the status should show the pinned model

  Scenario: User overrides heartbeat model via rho_control tool
    When the LLM calls rho_control(action: "model", model: "anthropic/claude-3-5-haiku-latest")
    Then the heartbeat model should be set to "anthropic/claude-3-5-haiku-latest"
    And subsequent heartbeats should use that model

  Scenario: User resets to auto-resolve via /rho command
    Given the heartbeat model is pinned to "anthropic/claude-3-5-haiku-latest"
    When I run "/rho model auto"
    Then the heartbeat should resume auto-resolving the cheapest model

  Scenario: Pinned model persisted across sessions
    Given the heartbeat model is pinned to "anthropic/claude-3-5-haiku-latest"
    And rho state is saved to ~/.pi/agent/rho-state.json
    When a new session starts and loads state from disk
    Then the heartbeat model should still be "anthropic/claude-3-5-haiku-latest"

  # ---------------------------------------------------------------------------
  # Status: show heartbeat model info
  # ---------------------------------------------------------------------------

  Scenario: Status shows auto-resolved heartbeat model
    When I run "/rho status"
    Then the status should include a "Heartbeat model" line
    And it should show the resolved model name and provider
    And it should show "(auto)" to indicate automatic selection

  Scenario: Status shows pinned heartbeat model
    Given the heartbeat model is pinned to "anthropic/claude-3-5-haiku-latest"
    When I run "/rho status"
    Then the status should show "Heartbeat model: anthropic/claude-3-5-haiku-latest (pinned)"

  Scenario: rho_control status includes model info
    When the LLM calls rho_control(action: "status")
    Then the result should include heartbeatModel and heartbeatModelSource fields

  # ---------------------------------------------------------------------------
  # Cost tracking
  # ---------------------------------------------------------------------------

  Scenario: Status bar shows heartbeat model indicator
    Given the heartbeat model is auto-resolved to "google-antigravity/gpt-oss-120b-medium"
    Then the rho status bar should show the heartbeat model indicator
    And it should be visually distinct from the session model

  # ---------------------------------------------------------------------------
  # Edge cases
  # ---------------------------------------------------------------------------

  Scenario: Only one provider/model available
    Given only "anthropic/claude-opus-4-5" has valid auth
    When the heartbeat fires
    Then rho should use "anthropic/claude-opus-4-5" for the heartbeat
    And no --provider/--model flags need to be added (it's the default)

  Scenario: Pinned model loses auth between sessions
    Given the heartbeat model is pinned to "openai-codex/gpt-5.1-codex-mini"
    And the openai-codex OAuth token has expired without refresh
    When the heartbeat fires
    Then rho should fall back to auto-resolve
    And the status should show a warning that the pinned model is unavailable

  Scenario: Model resolution does not block heartbeat timing
    When the heartbeat fires
    Then model resolution should complete in under 100ms
    And should not delay the next scheduled heartbeat
