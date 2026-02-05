Feature: rho run command dispatches to hats
  As a rho user
  I want to run heavy tasks via hats loops
  So that rho handles persistence and hats handles iteration

  Scenario: rho run with hats installed
    Given hats is installed and on PATH
    And I have a project with hats.yml
    When I run "rho run 'add jwt auth'"
    Then rho should spawn a hats loop with the prompt
    And stream hats output to the terminal
    And store the result in rho memory when complete

  Scenario: rho run without hats falls back to pi subagent
    Given hats is NOT installed
    When I run "rho run 'add jwt auth'"
    Then rho should fall back to a pi -p subagent
    And display a message suggesting hats installation

  Scenario: rho run with --proof generates proof artifact
    Given hats is installed
    When I run "rho run --proof 'add jwt auth'"
    Then a proof artifact should be written to proofs/
    And rho should store the proof summary in memory

  Scenario: heartbeat dispatches to hats for heavy work
    Given a HEARTBEAT.md task requires code implementation
    And hats is installed
    When the heartbeat fires
    Then the task should be dispatched via hats loop
    And not via a raw pi subagent
