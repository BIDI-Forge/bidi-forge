/** How this host is supported in the extension UI and fix pipeline. */
export type SupportTier = "full" | "css-only" | "generic";

export interface SiteAdapter {
  readonly id: string;
  readonly label: string;
  /** Suffix-based host patterns (e.g. `claude.ai` matches `foo.claude.ai`). */
  readonly hostPatterns: readonly string[];
  readonly supportTier: SupportTier;
  readonly messageRootSelectors: readonly string[];
  readonly composerShellSelector: string;
  readonly messageBubbleSelector: string;
  matchesHost(hostname: string, pathname?: string): boolean;
}
