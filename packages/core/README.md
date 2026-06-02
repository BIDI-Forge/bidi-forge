# @bidi-forge/core

Pure TypeScript Unicode BiDi engine for mixed Persian, Arabic, and English text.

## Install

```bash
npm install @bidi-forge/core
```

## API

```ts
import { fixMixedText, stripBidiMarkers, formatUiText } from "@bidi-forge/core";

fixMixedText("سلام hello دنیا");
// => سلام ‎hello‎ دنیا
```

See the [monorepo README](https://github.com/BIDI-Forge/bidi-forge) for full documentation.
