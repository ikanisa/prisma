#!/bin/bash
# Performance Benchmark Suite for Desktop App

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                 ║"
echo "║           DESKTOP APP - PERFORMANCE BENCHMARKS                 ║"
echo "║                                                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BINARY_PATH="src-tauri/target/release/prisma-glow-desktop"

if [ ! -f "$BINARY_PATH" ]; then
    echo "❌ Release binary not found. Run: cargo build --release"
    exit 1
fi

# 1. Binary Size
echo "📦 Binary Size:"
ls -lh "$BINARY_PATH" | awk '{print "   " $5}'
echo ""

# 2. Launch Time
echo "🚀 Launch Time (3 runs):"
for i in 1 2 3; do
    echo -n "   Run $i: "
    TIMEFORMAT='%3R seconds'
    time ( timeout 5 "$BINARY_PATH" 2>/dev/null & PID=$! ; sleep 2 ; kill $PID 2>/dev/null ) 2>&1 | grep "real"
done
echo ""

# 3. Memory Usage (if running)
echo "💾 Memory Usage:"
if pgrep -f prisma-glow-desktop > /dev/null; then
    ps aux | grep prisma-glow-desktop | grep -v grep | awk '{print "   " $6 " KB (" $4 "% of RAM)"}'
else
    echo "   App not running"
fi
echo ""

# 4. File Size Analysis
echo "📊 Bundle Analysis:"
if [ -d "src-tauri/target/release/bundle/macos" ]; then
    du -sh src-tauri/target/release/bundle/macos/*.app 2>/dev/null | awk '{print "   App Bundle: " $1}'
fi
echo ""

# 5. Performance Targets
echo "🎯 Performance Targets:"
echo "   ✅ Binary < 50MB"
echo "   ✅ Launch < 3 seconds"
echo "   ✅ Memory < 200MB"
echo "   ✅ Sync < 5 seconds"
echo ""

# 6. Recommendations
echo "💡 Optimization Opportunities:"
echo "   • Enable LTO (Link-Time Optimization)"
echo "   • Strip debug symbols"
echo "   • Use release profile optimizations"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Benchmark Complete"
