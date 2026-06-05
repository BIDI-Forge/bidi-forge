# Publishing RTL Text Fixer (VS Code extension)

Publisher namespace: **`amirmkazemi`**  
Extension ID: **`amirmkazemi.bidi-forge`**  
VSIX output: **`BIDI-Forge-<version>.vsix`**

## One-time setup

### 1. Build tools (from repo root)

```bash
pnpm install
```

### 2. Open VSX account and token

1. Sign in at [open-vsx.org](https://open-vsx.org/) (GitHub login).
2. Open [User settings → Access tokens](https://open-vsx.org/user-settings/tokens).
3. Create a token with **publish** scope.
4. Export it in your shell (do not commit):

```bash
export OPEN_VSX_TOKEN="your_token_here"
```

### 3. Namespace (first publish only)

If `amirmkazemi` is not yet linked to your Open VSX user, follow [namespace ownership](https://github.com/EclipseFdn/open-vsx.org/wiki/Publishing-Extensions#how-to-publish-an-extension) (usually automatic when publisher in `package.json` matches your account).

### 4. VS Code Marketplace (optional, separate from Open VSX)

```bash
pnpm exec vsce login amirmkazemi
```

## Release checklist (every version)

From **repo root**:

```bash
# 1. Bump version in packages/vscode-extension/package.json
# 2. Add entry to packages/vscode-extension/CHANGELOG.md

pnpm install
pnpm -C packages/vscode-extension test
pnpm -C packages/vscode-extension lint
pnpm smoke:vsix
```

The smoke script builds a `.vsix` and verifies commands + `rtl-ui.css`.

## Publish to Open VSX

**Listing copy for manual forms:** `store/OPEN_VSX_LISTING.md`  
**Persian manual upload guide:** `store/OPEN_VSX_MANUAL_UPLOAD_FA.md`

```bash
cd packages/vscode-extension
export OPEN_VSX_TOKEN="..."   # if not already set

pnpm package
pnpm dlx ovsx publish BIDI-Forge-*.vsix -p "$OPEN_VSX_TOKEN"
```

Or from repo root:

```bash
export OPEN_VSX_TOKEN="..."
pnpm -C packages/vscode-extension publish:ovsx
```

After publish, the extension page will be:

**https://open-vsx.org/extension/amirmkazemi/bidi-forge**

Install in VS Code / VSCodium: Extensions → search `RTL Text Fixer`, or:

```bash
code --install-extension amirmkazemi.bidi-forge
```

## Publish to VS Code Marketplace (optional)

```bash
cd packages/vscode-extension
pnpm publish:marketplace
```

Marketplace: **https://marketplace.visualstudio.com/items?itemName=amirmkazemi.rtl-text-fixer**

## Output artifact

| File | Path |
|------|------|
| VSIX | `packages/vscode-extension/BIDI-Forge-<version>.vsix` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ovsx: command not found` | Use `pnpm dlx ovsx` |
| `401 Unauthorized` | Regenerate `OPEN_VSX_TOKEN` |
| `Extension version already exists` | Bump `version` in `package.json` |
| VSIX missing core at runtime | Run `pnpm smoke:vsix`; ensure `dist/extension.cjs` contains `fixMixedText` |
| `vsce` dependency errors | We publish with `--no-dependencies` (core is bundled in `dist/extension.cjs`) |
