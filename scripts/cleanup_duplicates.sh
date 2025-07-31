#!/bin/bash

# =======================================================================
# CRITICAL FIX: Remove Duplicate Edge Functions
# =======================================================================
# This script removes 6 duplicate functions identified in the audit
# to reduce confusion and maintenance overhead.

set -e  # Exit on any error

echo "🧹 Starting duplicate function cleanup..."
echo "========================================"

# Array of duplicate functions to remove
DUPLICATES=(
    "opt-out-handler"
    "whatsapp_webhook" 
    "agent_router"
    "whatsapp-router"
    "memory-consolidator-v2"
    "quality-gate-v2"
)

# Array of canonical functions (keep these)
CANONICAL=(
    "opt-out-webhook"
    "whatsapp-webhook"
    "agent-router"
    "whatsapp-webhook"
    "memory-consolidator"
    "quality-gate"
)

# Backup directory
BACKUP_DIR="./backup_duplicates_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backup in: $BACKUP_DIR"

# Function to backup before deletion
backup_function() {
    local func_name=$1
    local backup_path="$BACKUP_DIR/$func_name"
    
    echo "📦 Backing up $func_name..."
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Copy function files if they exist
    if [ -d "supabase/functions/$func_name" ]; then
        cp -r "supabase/functions/$func_name"/* "$backup_path/" 2>/dev/null || true
        echo "   ✅ Backed up local files"
    fi
    
    # Get function info from Supabase
    echo "   📋 Function info:"
    supabase functions list | grep "$func_name" || echo "   ⚠️  Function not found in deployed list"
}

# Function to remove duplicate
remove_duplicate() {
    local func_name=$1
    local canonical_name=$2
    
    echo ""
    echo "🗑️  Processing: $func_name (duplicate of $canonical_name)"
    echo "----------------------------------------"
    
    # Backup first
    backup_function "$func_name"
    
    # Check if function is deployed
    if supabase functions list | grep -q "$func_name"; then
        echo "🚀 Removing deployed function: $func_name"
        supabase functions delete "$func_name" --yes || {
            echo "❌ Failed to delete deployed function: $func_name"
            return 1
        }
        echo "   ✅ Deployed function removed"
    else
        echo "   ℹ️  Function not deployed, skipping deployment removal"
    fi
    
    # Remove local files if they exist
    if [ -d "supabase/functions/$func_name" ]; then
        echo "📁 Removing local files: $func_name"
        rm -rf "supabase/functions/$func_name"
        echo "   ✅ Local files removed"
    else
        echo "   ℹ️  No local files found"
    fi
    
    echo "✅ Successfully processed: $func_name"
}

# Main execution
echo ""
echo "🔍 Found ${#DUPLICATES[@]} duplicate functions to remove:"
for i in "${!DUPLICATES[@]}"; do
    echo "   ${DUPLICATES[$i]} → ${CANONICAL[$i]}"
done

echo ""
echo "⚠️  WARNING: This will permanently delete the duplicate functions!"
echo "   Backup will be created in: $BACKUP_DIR"
echo ""

# Confirmation prompt
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting removal process..."

# Process each duplicate
for i in "${!DUPLICATES[@]}"; do
    remove_duplicate "${DUPLICATES[$i]}" "${CANONICAL[$i]}"
done

echo ""
echo "🎉 Cleanup completed successfully!"
echo "=================================="
echo "📁 Backup location: $BACKUP_DIR"
echo "📋 Summary:"
echo "   - ${#DUPLICATES[@]} duplicate functions removed"
echo "   - Backup created for safety"
echo "   - Canonical functions preserved"
echo ""
echo "🔍 Next steps:"
echo "   1. Test system functionality"
echo "   2. Update any hardcoded references"
echo "   3. Verify no broken dependencies"
echo ""
echo "✅ Cleanup script completed at $(date)" 