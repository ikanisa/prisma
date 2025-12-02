#!/bin/bash
# Desktop App - Crash Report Collection Script

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                 ║"
echo "║         DESKTOP APP - CRASH REPORT COLLECTOR                   ║"
echo "║                                                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

CRASH_REPORTS_DIR="$HOME/Library/Logs/DiagnosticReports"
APP_NAME="prisma-glow-desktop"
OUTPUT_DIR="./desktop-crash-reports"

mkdir -p "$OUTPUT_DIR"

echo "Searching for crash reports..."
echo ""

# Find crash reports
CRASHES=$(find "$CRASH_REPORTS_DIR" -name "${APP_NAME}*.crash" -o -name "${APP_NAME}*.ips" 2>/dev/null || true)

if [ -z "$CRASHES" ]; then
    echo "✅ No crash reports found (good news!)"
    exit 0
fi

echo "Found crash reports:"
echo "$CRASHES"
echo ""

# Copy crash reports
cp $CRASHES "$OUTPUT_DIR/" 2>/dev/null || true

echo "Crash reports copied to: $OUTPUT_DIR"
echo ""

# Analyze crash reports
echo "Recent crashes:"
for file in $CRASHES; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "File: $(basename "$file")"
    echo "Date: $(stat -f "%Sm" "$file")"
    echo ""
    
    # Extract exception type
    if grep -q "Exception Type:" "$file"; then
        grep "Exception Type:" "$file" | head -1
    fi
    
    # Extract crash reason
    if grep -q "Termination Reason:" "$file"; then
        grep "Termination Reason:" "$file" | head -1
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To view full report: open $OUTPUT_DIR"
echo ""

# Create summary
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# Desktop App Crash Reports

## How to Read Crash Reports

1. **Exception Type:** The type of crash (e.g., EXC_BAD_ACCESS, EXC_CRASH)
2. **Termination Reason:** Why the app crashed
3. **Thread 0 Crashed:** The stack trace showing where the crash occurred

## Common Crash Types

### EXC_BAD_ACCESS (SIGSEGV)
- Memory access violation
- Usually a null pointer dereference
- Check Rust code for unwrap() calls on None values

### EXC_CRASH (SIGABRT)
- Assertion failure or panic!
- Check Rust code for panic! or expect() calls

### EXC_BREAKPOINT (SIGTRAP)
- Triggered breakpoint
- Usually from unwrap() on Result::Err

## How to Fix

1. Identify the crashing function from the stack trace
2. Look for the Rust source file and line number
3. Add proper error handling instead of unwrap/expect
4. Test the fix locally
5. Release a patch

## Reporting

Send crash reports to: beta-feedback@prisma-glow.com

Include:
- The .crash or .ips file
- What you were doing when it crashed
- macOS version
- App version
EOF

echo "✅ Crash report summary created"
