#!/bin/bash
# Check TypeScript errors for a specific directory

if [ -z "$1" ]; then
  echo "Usage: ./scripts/check-types-dir.sh <directory>"
  echo "Example: ./scripts/check-types-dir.sh src/utils"
  exit 1
fi

DIR=$1

if [ ! -f "$DIR/tsconfig.json" ]; then
  echo "❌ Error: $DIR/tsconfig.json not found"
  echo "Create it first with strict mode enabled"
  exit 1
fi

echo "🔍 Checking TypeScript errors in $DIR..."
npx tsc --project "$DIR/tsconfig.json" --noEmit

if [ $? -eq 0 ]; then
  echo "✅ No TypeScript errors in $DIR"
else
  echo "❌ TypeScript errors found in $DIR"
fi
