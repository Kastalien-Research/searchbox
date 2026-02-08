#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB="$SCRIPT_DIR/workflows.db"

# Remove existing DB if present
rm -f "$DB"

# Create schema
sqlite3 "$DB" < "$SCRIPT_DIR/schema.sql"

# Seed with Exa-backed workflow archetypes
sqlite3 "$DB" < "$SCRIPT_DIR/seed-workflows.sql"

echo "Initialized $DB with schema + 5 Exa workflow archetypes"
