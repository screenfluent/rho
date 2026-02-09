#!/bin/bash
# Tests for tmux config installation
# Validates: config file exists, contains required settings,
# and install.sh logic handles existing configs correctly.

PASS=0
FAIL=0
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "Testing tmux config..."
echo ""

CONFIG="$REPO_DIR/configs/tmux-rho.conf"

# --- Config file exists ---
if [ -f "$CONFIG" ]; then
  pass "configs/tmux-rho.conf exists"
else
  fail "configs/tmux-rho.conf missing"
fi

# --- Required settings ---
for setting in "set -g mouse on" "set -g escape-time 10" "set -g history-limit 10000" "set -g prefix C-a"; do
  if grep -q "$setting" "$CONFIG" 2>/dev/null; then
    pass "config has: $setting"
  else
    fail "config missing: $setting"
  fi
done

# --- Status bar configured ---
if grep -q "status-left" "$CONFIG" && grep -q "status-right" "$CONFIG"; then
  pass "config has status bar"
else
  fail "config missing status bar"
fi

# --- Pane navigation ---
if grep -q "M-Left" "$CONFIG" && grep -q "M-Right" "$CONFIG"; then
  pass "config has Alt+arrow pane navigation"
else
  fail "config missing pane navigation bindings"
fi

# --- Split bindings ---
if grep -q 'bind |' "$CONFIG" && grep -q 'bind -' "$CONFIG"; then
  pass "config has | and - split bindings"
else
  fail "config missing split bindings"
fi

# --- tmux config is bootstrapped by rho init ---
# Tmux config installation moved from install.sh to rho init (init-core.ts).
# Verify the bootstrap logic references the tmux config.
if grep -q "tmux" "$REPO_DIR/cli/init-core.ts"; then
  pass "init-core.ts handles tmux config bootstrap"
else
  fail "init-core.ts missing tmux config bootstrap"
fi

# --- install.sh delegates to rho init ---
if grep -q "rho init\|cli/index.ts.*init" "$REPO_DIR/install.sh"; then
  pass "install.sh delegates bootstrap to rho init"
else
  fail "install.sh doesn't call rho init"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
