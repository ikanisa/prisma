# Phase 2: Day 1 - TypeScript Strict Mode Quick Start

**Date**: Ready to Start (Concurrent with Phase 1 Day 1)  
**Duration**: 2-3 hours  
**Goal**: Enable strict mode for src/types/ and create baseline  

---

## ✅ Prerequisites

```bash
# 1. Ensure you're on the TypeScript feature branch
git checkout -b feat/typescript-strict-mode

# OR if working on same branch as backend:
git checkout refactor/backend-modularization

# 2. Verify current TypeScript config
cat tsconfig.app.json | grep strict

# Should show:
# "strict": false,
# "noUnusedLocals": false,
# "noUnusedParameters": false,

# 3. Count current 'any' usage
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
# Current: 119 instances
```

---

## 🎯 Today's Objectives

1. ✅ Create baseline type check report
2. ✅ Enable strict mode for src/types/ (smallest directory)
3. ✅ Fix any type errors in src/types/
4. ✅ Create incremental migration strategy
5. ✅ Document common error patterns

---

## 📋 Step-by-Step Guide

### Step 1: Create Baseline Report (15 minutes)

```bash
# Create tracking directory
mkdir -p docs/typescript-migration

# Run current type check (should pass with strict: false)
npx tsc --noEmit > docs/typescript-migration/baseline-no-strict.log 2>&1
echo "Baseline (strict: false) exit code: $?" >> docs/typescript-migration/baseline-no-strict.log

# Create a test with strict mode enabled temporarily
cat > /tmp/test-strict-tsconfig.json << 'EOF'
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
EOF

# Check how many errors with strict mode (DON'T FIX YET)
npx tsc --project /tmp/test-strict-tsconfig.json --noEmit > docs/typescript-migration/baseline-strict-errors.log 2>&1

# Count errors
echo "---" >> docs/typescript-migration/baseline-strict-errors.log
echo "Total errors with strict mode:" >> docs/typescript-migration/baseline-strict-errors.log
grep -c "error TS" docs/typescript-migration/baseline-strict-errors.log || echo "0" >> docs/typescript-migration/baseline-strict-errors.log

# View summary
tail -20 docs/typescript-migration/baseline-strict-errors.log
```

**Expected output**: Hundreds of errors. Don't panic - we'll fix them incrementally!

---

### Step 2: Create Per-Directory TypeScript Configs (20 minutes)

Create a script to generate per-directory tsconfig files:

```bash
cat > scripts/create-ts-configs.sh << 'EOF'
#!/bin/bash
# Create per-directory tsconfig.json files for incremental strict mode enablement

DIRS=(
  "src/types"
  "src/utils"
  "src/lib"
  "src/services"
  "src/hooks"
  "src/stores"
  "src/components/ui"
  "src/components/forms"
  "src/components/clients"
  "src/components/settings"
  "src/components/assistant"
  "src/components/privacy"
  "src/pages"
  "src/agents"
  "src/integrations"
)

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Creating tsconfig.json in $dir"
    cat > "$dir/tsconfig.json" << 'TSCONFIG'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["./**/*"]
}
TSCONFIG
  fi
done

echo "✅ Created tsconfig.json files in all target directories"
EOF

chmod +x scripts/create-ts-configs.sh

# Note: DON'T run this yet - we'll enable strict mode one directory at a time
# Just save it for later use
```

---

### Step 3: Enable Strict Mode for src/types/ (30 minutes)

**Start with the smallest, most isolated directory**:

```bash
# Check what's in src/types/
ls -la src/types/

# Should show:
# yaml.d.ts  (ambient module declaration)

# Create strict tsconfig for src/types/ only
cat > src/types/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["./**/*"]
}
EOF

# Check for errors
npx tsc --project src/types/tsconfig.json --noEmit

# Expected: 0-2 errors (yaml.d.ts is just a declaration file)
```

**If you get errors**, fix them:

```bash
# View the file
cat src/types/yaml.d.ts

# Example fix (if needed):
# BEFORE:
# declare module '*.yaml' {
#   const data: any;
#   export default data;
# }

# AFTER:
# declare module '*.yaml' {
#   const data: Record<string, unknown>;
#   export default data;
# }
```

**Verify zero errors**:
```bash
npx tsc --project src/types/tsconfig.json --noEmit
# Should show: Found 0 errors. Watching for file changes.

echo "✅ src/types/ is now strict mode compliant!"
```

---

### Step 4: Create Migration Tracker (30 minutes)

```bash
cat > docs/typescript-migration/MIGRATION_TRACKER.md << 'EOF'
# TypeScript Strict Mode Migration Tracker

**Last Updated**: Day 1  
**Total Directories**: 15  
**Completed**: 1 (src/types/)  
**Remaining**: 14  
**Estimated Total Errors**: 500-1,000  

---

## Progress by Directory

### ✅ Completed (1)

| Directory | Files | Lines | Errors Fixed | Status | Date |
|-----------|-------|-------|--------------|--------|------|
| src/types/ | 1 | ~10 | 0-2 | ✅ Complete | Day 1 |

---

### 🟡 In Progress (0)

None

---

### ⏳ Pending (14)

| Directory | Files | Est. Lines | Est. Errors | Priority | Assigned To |
|-----------|-------|------------|-------------|----------|-------------|
| src/utils/ | ~20 | ~2,000 | 20-50 | High | Day 2 |
| src/lib/ | ~15 | ~1,500 | 30-60 | High | Day 3 |
| src/services/ | ~10 | ~1,200 | 20-40 | High | Day 3 |
| src/hooks/ | ~15 | ~800 | 30-60 | High | Day 4 |
| src/stores/ | ~8 | ~600 | 20-40 | Medium | Day 5 |
| src/components/ui/ | ~30 | ~3,000 | 50-100 | Critical | Day 6 |
| src/components/forms/ | ~15 | ~2,000 | 50-100 | Critical | Day 6 |
| src/components/clients/ | ~20 | ~2,500 | 50-100 | High | Day 7 |
| src/components/settings/ | ~15 | ~2,000 | 40-80 | High | Day 7 |
| src/components/assistant/ | ~10 | ~1,500 | 30-60 | Medium | Day 7 |
| src/components/privacy/ | ~5 | ~500 | 10-20 | Low | Day 8 |
| src/pages/ | ~20 | ~2,500 | 40-80 | High | Day 9 |
| src/agents/ | ~15 | ~2,000 | 40-80 | High | Day 9 |
| src/integrations/ | ~10 | ~1,500 | 30-60 | Medium | Day 9 |

**Total Pending**: ~208 files, ~23,600 lines, ~500-950 errors

---

## Daily Progress Log

### Day 1 (Today)
- [x] Baseline report created
- [x] src/types/ strict mode enabled
- [x] Migration tracker created
- [x] Common error patterns documented
- [ ] src/utils/ started

### Day 2
- [ ] src/utils/ completed
- [ ] Error patterns updated

### Day 3
- [ ] src/lib/ completed
- [ ] src/services/ completed

---

## Common Error Patterns Found

### 1. Implicit Any
```typescript
// ❌ Before
function format(value) {
  return value.toString();
}

// ✅ After
function format(value: unknown): string {
  return String(value);
}
```

### 2. Null/Undefined Checks
```typescript
// ❌ Before
function getName(user) {
  return user.name;
}

// ✅ After
function getName(user: User | null): string {
  return user?.name ?? 'Unknown';
}
```

---

## Blockers & Issues

| Issue | Impact | Workaround | Status |
|-------|--------|------------|--------|
| None yet | - | - | - |

---

## Next Steps

1. Begin Day 2: src/utils/
2. Update this tracker after each directory
3. Commit after each directory is complete

EOF

cat docs/typescript-migration/MIGRATION_TRACKER.md
```

---

### Step 5: Create Helper Scripts (20 minutes)

```bash
# Script to check a specific directory
cat > scripts/check-types-dir.sh << 'EOF'
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
  echo ""
  echo "To see detailed errors:"
  echo "  npx tsc --project $DIR/tsconfig.json --noEmit"
fi
EOF

chmod +x scripts/check-types-dir.sh

# Test it
./scripts/check-types-dir.sh src/types
```

```bash
# Script to count errors by type
cat > scripts/count-ts-errors.sh << 'EOF'
#!/bin/bash
# Count TypeScript error types

if [ -z "$1" ]; then
  LOG_FILE="docs/typescript-migration/baseline-strict-errors.log"
else
  LOG_FILE=$1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Error: Log file not found: $LOG_FILE"
  exit 1
fi

echo "📊 TypeScript Error Summary"
echo "============================="
echo ""

echo "Top 10 Error Types:"
grep "error TS" "$LOG_FILE" | sed 's/.*error TS\([0-9]*\):.*/TS\1/' | sort | uniq -c | sort -rn | head -10

echo ""
echo "Total Errors:"
grep -c "error TS" "$LOG_FILE" || echo "0"

echo ""
echo "Files with Most Errors:"
grep "error TS" "$LOG_FILE" | sed 's/\(.*\)(.*): error.*/\1/' | sort | uniq -c | sort -rn | head -10
EOF

chmod +x scripts/count-ts-errors.sh

# Run it
./scripts/count-ts-errors.sh
```

---

### Step 6: Document Common Patterns (30 minutes)

```bash
cat > docs/typescript-migration/COMMON_ERROR_FIXES.md << 'EOF'
# TypeScript Strict Mode - Common Error Fixes

Quick reference for fixing common TypeScript strict mode errors.

---

## Error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'

**Cause**: Type mismatch in function call

**Fix**:
```typescript
// ❌ Before
function greet(name: string) {
  console.log(`Hello ${name}`);
}
const user = { name: 'Alice', age: 30 };
greet(user);  // TS2345: Argument of type '{ name: string; age: number; }' is not assignable

// ✅ After
greet(user.name);  // Pass just the string
```

---

## Error TS7006: Parameter 'X' implicitly has an 'any' type

**Cause**: Function parameter without type annotation

**Fix**:
```typescript
// ❌ Before
function double(x) {  // TS7006: Parameter 'x' implicitly has an 'any' type
  return x * 2;
}

// ✅ After
function double(x: number): number {
  return x * 2;
}
```

---

## Error TS2531: Object is possibly 'null'

**Cause**: Accessing property on nullable value

**Fix**:
```typescript
// ❌ Before
function getUserEmail(user: User | null) {
  return user.email.toLowerCase();  // TS2531: Object is possibly 'null'
}

// ✅ After (Option 1: Optional chaining)
function getUserEmail(user: User | null): string {
  return user?.email?.toLowerCase() ?? '';
}

// ✅ After (Option 2: Type guard)
function getUserEmail(user: User | null): string {
  if (!user || !user.email) {
    return '';
  }
  return user.email.toLowerCase();
}
```

---

## Error TS2532: Object is possibly 'undefined'

**Cause**: Accessing property on possibly undefined value

**Fix**:
```typescript
// ❌ Before
interface Config {
  apiUrl?: string;
}

function getApiUrl(config: Config) {
  return config.apiUrl.toUpperCase();  // TS2532: Object is possibly 'undefined'
}

// ✅ After
function getApiUrl(config: Config): string {
  return config.apiUrl?.toUpperCase() ?? 'https://api.default.com';
}
```

---

## Error TS2322: Type 'X' is not assignable to type 'Y'

**Cause**: Variable assignment type mismatch

**Fix**:
```typescript
// ❌ Before
let count: number = "5";  // TS2322: Type 'string' is not assignable to type 'number'

// ✅ After
let count: number = Number("5");
// OR
let count: string = "5";
```

---

## Error TS2769: No overload matches this call

**Cause**: Function arguments don't match any available signature

**Fix**:
```typescript
// ❌ Before
const user = { name: 'Alice' };
JSON.stringify(user, 2);  // TS2769: No overload matches (replacer is wrong type)

// ✅ After
JSON.stringify(user, null, 2);  // Correct: (value, replacer, space)
```

---

## Error TS2339: Property 'X' does not exist on type 'Y'

**Cause**: Accessing non-existent property

**Fix**:
```typescript
// ❌ Before
interface User {
  name: string;
}

const user: User = { name: 'Alice' };
console.log(user.email);  // TS2339: Property 'email' does not exist

// ✅ After (Option 1: Add property to interface)
interface User {
  name: string;
  email?: string;
}

// ✅ After (Option 2: Type assertion if you're sure)
console.log((user as any).email);  // Not recommended

// ✅ After (Option 3: Check property exists)
if ('email' in user) {
  console.log((user as User & { email: string }).email);
}
```

---

## Error TS2454: Variable 'X' is used before being assigned

**Cause**: Using variable before initialization

**Fix**:
```typescript
// ❌ Before
let result: string;
if (condition) {
  result = 'yes';
}
console.log(result);  // TS2454: Variable 'result' is used before being assigned

// ✅ After
let result: string = 'default';
if (condition) {
  result = 'yes';
}
console.log(result);
```

---

## Error TS2564: Property 'X' has no initializer

**Cause**: Class property not initialized

**Fix**:
```typescript
// ❌ Before
class User {
  name: string;  // TS2564: Property 'name' has no initializer
}

// ✅ After (Option 1: Initialize in declaration)
class User {
  name: string = '';
}

// ✅ After (Option 2: Initialize in constructor)
class User {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// ✅ After (Option 3: Mark as optional)
class User {
  name?: string;
}

// ✅ After (Option 4: Definite assignment assertion - use sparingly)
class User {
  name!: string;  // I promise to initialize this later
}
```

---

## React-Specific Errors

### Props Type Missing

```typescript
// ❌ Before
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// ✅ After
interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

function Button({ onClick, children }: ButtonProps): JSX.Element {
  return <button onClick={onClick}>{children}</button>;
}
```

### Event Handler Type

```typescript
// ❌ Before
function handleChange(event) {
  console.log(event.target.value);
}

// ✅ After
function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
  console.log(event.target.value);
}
```

### useState Type

```typescript
// ❌ Before
const [user, setUser] = useState(null);

// ✅ After
interface User {
  id: string;
  name: string;
}

const [user, setUser] = useState<User | null>(null);
```

---

## Quick Reference

### Common React Types
```typescript
React.ReactNode          // children prop
React.FC<Props>          // Functional component (deprecated, use function)
JSX.Element              // Component return type
React.CSSProperties      // style prop
React.Ref<HTMLDivElement> // ref prop
```

### Common Event Types
```typescript
React.MouseEvent<HTMLButtonElement>
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>
React.KeyboardEvent<HTMLInputElement>
React.FocusEvent<HTMLInputElement>
```

### Common Hook Types
```typescript
useState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>]
useRef<T>(initialValue: T | null): MutableRefObject<T | null>
useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T
useMemo<T>(factory: () => T, deps: DependencyList): T
```

---

## Tips

1. **Use optional chaining (`?.`)** instead of manual null checks
2. **Use nullish coalescing (`??`)** for default values
3. **Enable "strict" in small increments** (per directory)
4. **Run tests after each fix** to ensure behavior unchanged
5. **Commit frequently** - one directory at a time
6. **Ask for help** if stuck on a complex type error

---

**Last Updated**: Day 1  
**Next**: Apply these patterns to src/utils/ on Day 2
EOF

cat docs/typescript-migration/COMMON_ERROR_FIXES.md
```

---

## 📊 End of Day 1 Deliverables

You should now have:

1. ✅ **Baseline reports**:
   - `docs/typescript-migration/baseline-no-strict.log`
   - `docs/typescript-migration/baseline-strict-errors.log`

2. ✅ **src/types/ strict mode enabled**:
   - `src/types/tsconfig.json` (with strict: true)
   - Zero TypeScript errors in src/types/

3. ✅ **Migration tracker**:
   - `docs/typescript-migration/MIGRATION_TRACKER.md`

4. ✅ **Helper scripts**:
   - `scripts/check-types-dir.sh`
   - `scripts/count-ts-errors.sh`

5. ✅ **Documentation**:
   - `docs/typescript-migration/COMMON_ERROR_FIXES.md`

---

## 📝 Commit Your Work

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat(types): Enable strict mode for src/types/ (Day 1)

- Created baseline TypeScript error reports
- Enabled strict mode for src/types/ directory
- Fixed type errors in yaml.d.ts
- Created migration tracker and helper scripts
- Documented common error patterns

Progress: 1/15 directories complete (7%)
Errors fixed: 0-2
Next: src/utils/ (Day 2)"

# Push to remote
git push origin feat/typescript-strict-mode
```

---

## ✅ Day 1 Success Criteria

- [x] Baseline reports generated
- [x] src/types/ compiles with strict mode (0 errors)
- [x] Migration tracker created
- [x] Helper scripts working
- [x] Documentation complete
- [x] Work committed to Git

**Progress**: 7% complete (1/15 directories) ✅

---

## 🚀 Tomorrow (Day 2)

**Goal**: Enable strict mode for src/utils/

**Tasks**:
1. Create `src/utils/tsconfig.json` with strict mode
2. Run type check, count errors
3. Fix all errors in src/utils/
4. Run tests to verify behavior unchanged
5. Commit and update tracker

**Estimated errors**: 20-50  
**Estimated time**: 3-4 hours

---

## 📞 Need Help?

- **Stuck on a type error?** Check `COMMON_ERROR_FIXES.md`
- **Error pattern not documented?** Ask in #typescript-strict Slack
- **Breaking change concern?** Run tests after each fix
- **Too many errors?** Fix one file at a time, commit often

---

**Status**: Day 1 Complete ✅  
**Next**: Day 2 - src/utils/  
**Updated**: 2025-01-28
