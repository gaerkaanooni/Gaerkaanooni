#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# deploy-migrations.sh — apply Prisma migrations to a HOSTED database
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/deploy-migrations.sh
#
# Applies all pending Prisma migrations to whatever Postgres DATABASE_URL points
# at (Supabase or Neon). This is a no-op locally when the schema is already in
# sync; run it as part of the deployment pipeline before the new build ships.
# ---------------------------------------------------------------------------
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL not set." >&2
  echo "Point it at your hosted Postgres (Supabase or Neon), e.g.:" >&2
  echo "  DATABASE_URL=postgresql://USER@HOST:5432/pil_promax bash scripts/deploy-migrations.sh" >&2
  exit 1
fi

echo "==> Running 'prisma migrate deploy' against the DATABASE_URL target"
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

echo "==> Regenerating the Prisma client"
npx prisma generate --schema packages/db/prisma/schema.prisma

echo "DB schema is now in sync at the deployed target."
