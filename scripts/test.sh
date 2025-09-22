#!/bin/bash

# easyMO Test Runner Script
set -e

echo "🧪 Running easyMO test suite..."

# Unit tests
echo "📋 Running unit tests..."
npm run test:unit

# Integration tests
echo "🔗 Running integration tests..."
npm run test:integration

# Edge function tests
echo "⚡ Running edge function tests..."
npm run test:edge

# E2E tests (if in CI or explicitly requested)
if [ "$CI" = "true" ] || [ "$1" = "--e2e" ]; then
  echo "🌐 Running E2E tests..."
  npm run test:e2e
fi

# Coverage report
echo "📊 Generating coverage report..."
npm run test:coverage

echo "✅ All tests completed!"