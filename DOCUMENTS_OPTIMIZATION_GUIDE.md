# 🔧 DOCUMENTS.TSX OPTIMIZATION GUIDE

**File:** `src/pages/documents.tsx`  
**Changes:** 564 lines → ~200 lines  
**Backup:** Created at `src/pages/documents.tsx.backup`

---

## KEY CHANGES

### 1. Add Import (Line ~3)
```typescript
// Add this import after existing imports
import { VirtualList } from '@/components/ui/virtual-list';
import { DocumentCard } from '@/components/documents/DocumentCard';
```

### 2. Remove Motion Import (Line 2)
```typescript
// REMOVE THIS:
import { motion } from 'framer-motion';
```

### 3. Replace formatFileSize Function (Lines 31-37)
```typescript
// REMOVE - Now in DocumentCard component
// The formatFileSize function is moved to DocumentCard.tsx
```

### 4. Replace Document Rendering Section (Lines ~354-456)

**REPLACE THIS ENTIRE SECTION:**
```typescript
{loading && documents.length === 0 ? (
  <div className="flex items-center justify-center py-10 text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading documents...
  </div>
) : (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {filteredDocuments.map((document, index) => (
      <motion.div key={document.id} ...>
        <Card className="hover-lift glass">
          {/* 100+ lines of card content */}
        </Card>
      </motion.div>
    ))}
  </div>
)}
```

**WITH THIS:**
```typescript
{loading && documents.length === 0 ? (
  <div className="flex items-center justify-center py-10 text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading documents...
  </div>
) : filteredDocuments.length > 0 ? (
  <VirtualList
    items={filteredDocuments}
    estimateSize={100}
    overscan={3}
    renderItem={(document) => (
      <DocumentCard
        document={document}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onDelete={handleArchive}
        onRestore={handleRestore}
        canArchive={canArchive}
        isArchived={view === 'archived'}
      />
    )}
    className="h-[calc(100vh-300px)] w-full"
  />
) : null}
```

---

## IMPLEMENTATION DECISION

This is a significant change. I have 2 options:

### Option A: Create New File (RECOMMENDED)
I'll create a complete new optimized version as:
- `src/pages/documents-optimized.tsx`
- You can test it alongside the original
- Switch when ready by renaming files
- Zero risk of breaking current version

### Option B: Direct Edit
I'll edit the current file directly
- Faster to deploy
- Backup is already created
- Can rollback if needed

---

**Which approach do you prefer?**

- **"new file"** or **"option a"** → I'll create documents-optimized.tsx
- **"direct edit"** or **"option b"** → I'll modify documents.tsx directly

**What's your choice?**
