#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${OPEN_VSX_TOKEN:-}" ]]; then
  echo "Set OPEN_VSX_TOKEN (create at https://open-vsx.org/user-settings/tokens)" >&2
  exit 1
fi

pnpm package
VSIX=(BIDI-Forge-*.vsix)
if [[ ! -f ${VSIX[0]} ]]; then
  echo "No VSIX found after package" >&2
  exit 1
fi

echo "Publishing ${VSIX[0]} to Open VSX..."
pnpm dlx --yes ovsx publish "${VSIX[0]}" -p "$OPEN_VSX_TOKEN"
echo "Done: https://open-vsx.org/extension/amirmkazemi/bidi-forge"
