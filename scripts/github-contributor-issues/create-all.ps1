# Creates contributor-friendly GitHub issues with checkbox acceptance criteria.
# Prerequisites: GitHub CLI (gh) installed and authenticated (`gh auth login`).
# Usage (from repo root):
#   .\scripts\github-contributor-issues\create-all.ps1
# Optional:
#   .\scripts\github-contributor-issues\create-all.ps1 -Repo "owner/repo"

param(
  [string] $Repo = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Resolve-Gh {
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    return "gh"
  }
  $p = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"
  if (Test-Path $p) {
    return $p
  }
  throw "GitHub CLI (gh) not found. Install from https://cli.github.com/ or winget install GitHub.cli"
}

function Resolve-Repo {
  param([string] $Explicit)
  if ($Explicit) {
    return $Explicit
  }
  $remote = git -C (Join-Path $here "..\..") remote get-url origin 2>$null
  if (-not $remote) {
    throw "Could not read git remote origin. Pass -Repo owner/name."
  }
  if ($remote -match "github\.com[:/]([^/]+)/([^/.]+)(\.git)?$") {
    return "$($Matches[1])/$($Matches[2])"
  }
  throw "Could not parse owner/repo from remote: $remote. Pass -Repo owner/name."
}

$gh = Resolve-Gh
$repo = Resolve-Repo $Repo

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& $gh auth status 2>$null 1>$null
$exit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($exit -ne 0) {
  throw "Not logged in. Run: gh auth login"
}

$issues = @(
  @{
    Title  = "Improve RTL layout for Cursor Agent / VS Code chat (Custom CSS)"
    File   = "issue-01-rtl-chat-ui.md"
    Labels = @("good first issue", "vscode-extension", "help wanted")
  },
  @{
    Title  = "Harden clipboard workflow for text copied from AI chats (ChatGPT, Gemini, Grok, ...)"
    File   = "issue-02-clipboard-ai-chats.md"
    Labels = @("enhancement", "core")
  },
  @{
    Title  = "Chrome extension: optional per-site rules or presets for AI web apps"
    File   = "issue-03-chrome-ai-presets.md"
    Labels = @("enhancement", "chrome-extension")
  },
  @{
    Title  = "Core: bidi edge cases - URLs, emails, numbers, and emoji"
    File   = "issue-04-core-urls-numbers.md"
    Labels = @("good first issue", "core")
  },
  @{
    Title  = "VS Code extension: optional English command titles (locale / setting)"
    File   = "issue-05-english-command-titles.md"
    Labels = @("enhancement", "vscode-extension", "i18n")
  },
  @{
    Title  = "Document and automate verification of Custom CSS RTL setup"
    File   = "issue-06-custom-css-docs.md"
    Labels = @("documentation", "vscode-extension")
  },
  @{
    Title  = "Integration tests or smoke script for packaged VSIX"
    File   = "issue-07-vsix-smoke-ci.md"
    Labels = @("ci", "testing")
  }
)

foreach ($item in $issues) {
  $path = Join-Path $here $item.File
  if (-not (Test-Path $path)) {
    throw "Missing body file: $path"
  }
  $labelArgs = @()
  foreach ($l in $item.Labels) {
    $labelArgs += "--label"
    $labelArgs += $l
  }
  Write-Host "Creating: $($item.Title)"
  & $gh issue create --repo $repo --title $item.Title --body-file $path @labelArgs
}

Write-Host "Done. Open: https://github.com/$repo/issues"
