#!/bin/bash

# Script to create a new feature component with proper structure
# Usage: ./scripts/create-feature-component.sh <feature-name> <component-name>

FEATURE=$1
COMPONENT=$2

if [ -z "$FEATURE" ] || [ -z "$COMPONENT" ]; then
  echo "❌ Error: Missing arguments"
  echo ""
  echo "Usage: ./scripts/create-feature-component.sh <feature-name> <component-name>"
  echo ""
  echo "Example:"
  echo "  ./scripts/create-feature-component.sh documents DocumentsList"
  echo ""
  exit 1
fi

# Create directory
DIR="src/components/features/$FEATURE"
mkdir -p "$DIR"

# Create component file
FILE="$DIR/$COMPONENT.tsx"

if [ -f "$FILE" ]; then
  echo "⚠️  File already exists: $FILE"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

cat > "$FILE" << EOF
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ${COMPONENT}Props {
  className?: string;
  // Add more props as needed
}

/**
 * ${COMPONENT}
 * 
 * Part of the ${FEATURE} feature.
 * 
 * @example
 * <${COMPONENT} />
 */
export function $COMPONENT({ className }: ${COMPONENT}Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('', className)}
    >
      {/* Component content */}
      <p className="text-muted-foreground">
        ${COMPONENT} component - ready for implementation
      </p>
    </motion.div>
  );
}
EOF

echo "✅ Created: $FILE"

# Create index file if it doesn't exist
INDEX="$DIR/index.ts"
if [ ! -f "$INDEX" ]; then
  cat > "$INDEX" << EOF
// Export all components from the ${FEATURE} feature
export * from './$COMPONENT';
EOF
  echo "✅ Created: $INDEX"
else
  # Add export to existing index
  if ! grep -q "export \* from './$COMPONENT'" "$INDEX"; then
    echo "export * from './$COMPONENT';" >> "$INDEX"
    echo "✅ Added export to: $INDEX"
  fi
fi

echo ""
echo "🎉 Component created successfully!"
echo ""
echo "Next steps:"
echo "  1. Edit $FILE"
echo "  2. Import in your page: import { $COMPONENT } from '@/components/features/$FEATURE'"
echo "  3. Use in JSX: <$COMPONENT />"
echo ""
