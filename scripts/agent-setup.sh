#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. See https://nodejs.org/" >&2
  exit 1
fi

node - <<'NODE'
const [major, minor] = process.versions.node.split('.').map(Number);
const supported = (major === 22 && minor >= 12) || (major === 24 && minor >= 13);
if (!supported) {
  console.error(`Angular 22 requires Node.js 22.12+ or 24.13+; found ${process.versions.node}.`);
  process.exit(1);
}
console.log(`Node.js ${process.versions.node} is supported.`);
NODE

echo "npm $(npm --version)"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
