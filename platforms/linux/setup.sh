#!/bin/bash
# Linux platform setup — run by install.sh after symlinks are in place.
# Checks for platform-specific tools used by Linux skills.
# Informational only — does not block install.

echo "Checking Linux platform tools..."
echo ""

MISSING=0

# Detect display server
SESSION_TYPE="${XDG_SESSION_TYPE:-}"
if [ -z "$SESSION_TYPE" ]; then
  if [ -n "$WAYLAND_DISPLAY" ]; then
    SESSION_TYPE="wayland"
  elif [ -n "$DISPLAY" ]; then
    SESSION_TYPE="x11"
  else
    SESSION_TYPE="headless"
  fi
fi

# Detect package manager for install hints
install_hint() {
  local pkg="$1"
  if command -v apt &>/dev/null; then
    echo "sudo apt install $pkg"
  elif command -v pacman &>/dev/null; then
    echo "sudo pacman -S $pkg"
  elif command -v dnf &>/dev/null; then
    echo "sudo dnf install $pkg"
  else
    echo "Install '$pkg' using your package manager"
  fi
}

# notify-send — used by notification skill
if command -v notify-send &>/dev/null; then
  echo "  ✓ notify-send (notifications)"
else
  echo "  ⚠ notify-send not found. Install: $(install_hint libnotify-bin)"
  MISSING=1
fi

# Clipboard tools — depends on display server
if [ "$SESSION_TYPE" = "wayland" ]; then
  if command -v wl-copy &>/dev/null && command -v wl-paste &>/dev/null; then
    echo "  ✓ wl-copy/wl-paste (clipboard, Wayland)"
  else
    echo "  ⚠ wl-clipboard not found. Install: $(install_hint wl-clipboard)"
    MISSING=1
  fi
elif [ "$SESSION_TYPE" = "x11" ]; then
  if command -v xclip &>/dev/null; then
    echo "  ✓ xclip (clipboard, X11)"
  elif command -v xsel &>/dev/null; then
    echo "  ✓ xsel (clipboard, X11)"
  else
    echo "  ⚠ No clipboard tool found. Install: $(install_hint xclip)"
    MISSING=1
  fi
else
  echo "  • clipboard: no display server detected (headless). Clipboard skills unavailable."
fi

# xdg-open — used by open-url skill
if command -v xdg-open &>/dev/null; then
  echo "  ✓ xdg-open (URLs, files)"
else
  echo "  ⚠ xdg-open not found. Install: $(install_hint xdg-utils)"
  MISSING=1
fi

# TTS — espeak or spd-say
if command -v espeak &>/dev/null; then
  echo "  ✓ espeak (text-to-speech)"
elif command -v espeak-ng &>/dev/null; then
  echo "  ✓ espeak-ng (text-to-speech)"
elif command -v spd-say &>/dev/null; then
  echo "  ✓ spd-say (text-to-speech)"
else
  echo "  ⚠ No TTS tool found. Install: $(install_hint espeak)"
  MISSING=1
fi

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "All Linux platform tools available."
else
  echo "Some optional tools are missing. Platform skills will note alternatives."
  echo "These are not required — install them as needed."
fi
