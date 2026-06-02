#!/usr/bin/env bash
# Create GitHub issue for composer selection bug (requires: gh auth login)
set -euo pipefail
REPO="${1:-BIDI-Forge/bidi-forge}"
GH_BIN="${GH_BIN:-gh}"
"$GH_BIN" issue create \
  --repo "$REPO" \
  --title "fix: composer text selection interferes with BiDi markers" \
  --body-file ".github/ISSUE_DRAFT_selection-composer.md" \
  --label bug
