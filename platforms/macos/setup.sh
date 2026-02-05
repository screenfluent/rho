#!/bin/bash
# macOS platform setup — run by install.sh after symlinks are in place.
# Checks for platform-specific tools used by macOS skills.
# Informational only — does not block install.

echo "Checking macOS platform tools..."
echo ""

ALL_OK=1

# osascript — built-in, used by notification skill
if command -v osascript &>/dev/null; then
  echo "  ✓ osascript (notifications, scripting)"
else
  echo "  ⚠ osascript not found (unexpected on macOS)"
  ALL_OK=0
fi

# pbcopy/pbpaste — built-in, used by clipboard skill
if command -v pbcopy &>/dev/null && command -v pbpaste &>/dev/null; then
  echo "  ✓ pbcopy/pbpaste (clipboard)"
else
  echo "  ⚠ pbcopy/pbpaste not found (unexpected on macOS)"
  ALL_OK=0
fi

# open — built-in, used by open-url skill
if command -v open &>/dev/null; then
  echo "  ✓ open (URLs, files, apps)"
else
  echo "  ⚠ open not found (unexpected on macOS)"
  ALL_OK=0
fi

# say — built-in, used by tts skill
if command -v say &>/dev/null; then
  echo "  ✓ say (text-to-speech)"
else
  echo "  ⚠ say not found (unexpected on macOS)"
  ALL_OK=0
fi

echo ""
if [ "$ALL_OK" -eq 1 ]; then
  echo "All macOS platform tools available. No additional installs needed."
else
  echo "Some tools missing — this is unusual on macOS. Platform skills may not work."
fi
