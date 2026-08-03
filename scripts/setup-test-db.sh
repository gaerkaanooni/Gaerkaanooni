#!/usr/bin/env bash
# Creates the local dev + test databases if they don't exist (Homebrew Postgres).
set -euo pipefail

createdb pil_promax 2>/dev/null || echo "db 'pil_promax' exists"
createdb pil_promax_test 2>/dev/null || echo "db 'pil_promax_test' exists"

echo "Databases ready:"
psql -lqt | cut -d '|' -f 1 | grep -E 'pil_promax' || true
