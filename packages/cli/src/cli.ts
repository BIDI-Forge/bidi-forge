#!/usr/bin/env node
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

import { fixMixedText } from "@bidi-forge/core";

function printUsage(): void {
  stdout.write(`Usage: bidi-forge fix [text]
       echo "سلام hello" | bidi-forge fix

Fix mixed Persian/Arabic + English text with Unicode BiDi markers.
`);
}

async function readStdin(): Promise<string> {
  if (stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function runFix(argText?: string): Promise<number> {
  const fromArg = argText?.trim() ? argText : "";
  const fromStdin = fromArg ? "" : await readStdin();
  const input = (fromArg || fromStdin).replace(/\r\n/g, "\n");

  if (!input.trim()) {
    printUsage();
    return 1;
  }

  stdout.write(fixMixedText(input));
  if (!input.endsWith("\n") && input.includes("\n")) {
    /* preserve trailing newline behavior */
  } else if (input.endsWith("\n") && !fixMixedText(input).endsWith("\n")) {
    stdout.write("\n");
  }
  return 0;
}

async function main(): Promise<number> {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return command ? 0 : 1;
  }

  if (command === "fix") {
    return runFix(rest.join(" "));
  }

  if (command === "repl") {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    stdout.write("bidi-forge repl — paste mixed text, empty line to fix.\n");
    let buffer = "";
    rl.on("line", (line) => {
      if (line.trim() === "" && buffer.trim()) {
        stdout.write(fixMixedText(buffer.trim()) + "\n\n");
        buffer = "";
        return;
      }
      buffer += (buffer ? "\n" : "") + line;
    });
    return 0;
  }

  printUsage();
  return 1;
}

void main().then((code) => {
  process.exitCode = code;
});
