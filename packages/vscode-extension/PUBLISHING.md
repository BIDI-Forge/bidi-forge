# Publishing RTL Text Fixer

## VS Code Marketplace

```bash
pnpm -C packages/vscode-extension build
cd packages/vscode-extension
pnpm exec vsce login amirmkazemi
pnpm publish
```

Marketplace item: `amirmkazemi.rtl-text-fixer`

## Open VSX (Cursor / VSCodium)

```bash
pnpm -C packages/vscode-extension package
pnpm dlx ovsx publish rtl-text-fixer-*.vsix -p <OPEN_VSX_TOKEN>
```

After publish, add badges to the root README:

- VS Marketplace: `https://marketplace.visualstudio.com/items?itemName=amirmkazemi.rtl-text-fixer`
- Open VSX: `https://open-vsx.org/extension/amirmkazemi/rtl-text-fixer`
