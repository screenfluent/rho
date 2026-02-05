Feature: rho login -- authenticate with LLM providers
  As a rho user
  I want to authenticate with my LLM provider via rho login
  So that I can use my existing subscription without manual config

  Background:
    Given pi (0.51+) is installed
    And pi has a /login slash command that opens an OAuth provider selector

  Scenario: rho login starts pi with login flow
    When I run "rho login"
    Then rho should start pi in interactive mode
    And pi should display the OAuth provider selector
    And I should be able to complete the OAuth flow
    And the token should be stored in ~/.pi/agent/auth.json

  Scenario: rho login --provider skips picker
    When I run "rho login --provider anthropic"
    Then pi should start the OAuth flow directly for "anthropic"
    Without showing the full provider selector

  Scenario: rho login --status shows auth state
    Given I have authenticated with anthropic
    When I run "rho login --status"
    Then I should see which providers have stored credentials
    And whether each credential is an API key or OAuth token

  Scenario: rho login --logout removes credentials
    Given I have authenticated with anthropic
    When I run "rho login --logout anthropic"
    Then the anthropic credential should be removed from auth.json
    And I should see confirmation of removal

  Scenario: rho login works without existing auth.json
    Given ~/.pi/agent/auth.json does not exist
    When I run "rho login"
    Then pi should create auth.json during the OAuth flow
    And the login should complete normally

  # Implementation notes:
  # - rho login is a new subcommand in scripts/rho (or a separate rho-login script)
  # - Core flow: invoke pi interactively, triggering /login
  # - --status reads ~/.pi/agent/auth.json directly (jq/node)
  # - --logout removes provider entry from auth.json
  # - Must work on all platforms (macOS, Linux, Android/Termux)
