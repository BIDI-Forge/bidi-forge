import { stripLegacyEmbedding } from "./isolates.js";

/**
 * NFC-normalize and remove legacy embedding controls (LRE/RLE/PDF/LRO/RLO).
 * Does not strip LRM/RLM/isolates — use `stripBidiMarkers` for that.
 */
export function normalizeText(text: string): string {
  return stripLegacyEmbedding(text.normalize("NFC"));
}
