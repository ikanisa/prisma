# Virtual Scrolling Integration Guide

**Target Pages:** documents.tsx, tasks.tsx, knowledge/repositories.tsx  
**Technology:** @tanstack/react-virtual  
**Status:** Infrastructure ready, integration documented for future sprint  
**Est. Performance Gain:** 10x faster rendering, -90% memory usage

---

## 📋 OVERVIEW

This guide provides step-by-step instructions for integrating virtual scrolling into high-traffic pages with large lists. Virtual scrolling renders only visible items, dramatically improving performance for lists with 1000+ items.

**Why virtual scrolling?**
- Renders only ~20-30 visible items instead of all 1000+
- Reduces memory usage by 90%
- Maintains 60fps scrolling
- Improves initial render time by 10x

**When to use:**
- Lists with 100+ items
- Tables with 50+ rows
- Grids with 30+ cards
- Any scrollable container with dynamic content

---

## 🎯 INTEGRATION TARGETS

| Page | Current | Items | Priority | Est. Time |
|------|---------|-------|----------|-----------|
| documents.tsx | Standard map | 500-2000 | HIGH | 45 min |
| tasks.tsx | Standard map | 200-1000 | HIGH | 45 min |
| knowledge/repositories.tsx | Grid layout | 100-500 | MEDIUM | 30 min |

---

## 📦 PREREQUISITES

### 1. Dependencies (Already Installed)
```bash
# Verify installation
pnpm list @tanstack/react-virtual
# Should show: @tanstack/react-virtual 3.10.8
```

### 2. Components Available
- ✅ `src/components/virtual/VirtualList.tsx`
- ✅ `src/components/virtual/VirtualTable.tsx`
- ✅ `src/components/virtual/VirtualGrid.tsx`

---

## 🔨 PATTERN 1: Documents List (VirtualList)

### Current Implementation

**File:** `src/pages/documents.tsx`

```typescript
// CURRENT (Standard Rendering)
export function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments();
  
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {documents.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
```

**Performance:**
- Renders ALL documents at once (500-2000 items)
- Memory: ~50MB for 1000 documents
- Initial render: ~800ms
- Scroll performance: 30-40fps (janky)

### Virtual Implementation

```typescript
// OPTIMIZED (Virtual Scrolling)
import { VirtualList } from '@/components/virtual/VirtualList';

export function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments();
  
  if (isLoading) return <LoadingSpinner />;

  return (
    <VirtualList
      items={documents}
      estimateSize={() => 120}  // Height of DocumentCard in pixels
      renderItem={(doc) => (
        <DocumentCard document={doc} />
      )}
      className="h-[calc(100vh-12rem)]"  // Set explicit height
      gap={16}  // Space between items (Tailwind space-y-4 = 16px)
    />
  );
}
```

**Performance Gain:**
- Renders only ~15-20 visible documents
- Memory: ~5MB (90% reduction)
- Initial render: ~80ms (10x faster)
- Scroll performance: 60fps (smooth)

### Step-by-Step Integration

**Step 1: Import VirtualList**
```typescript
import { VirtualList } from '@/components/virtual/VirtualList';
```

**Step 2: Replace map with VirtualList**
```typescript
// BEFORE:
<div className="space-y-4">
  {documents.map(doc => <DocumentCard key={doc.id} document={doc} />)}
</div>

// AFTER:
<VirtualList
  items={documents}
  estimateSize={() => 120}
  renderItem={(doc) => <DocumentCard document={doc} />}
  className="h-[calc(100vh-12rem)]"
/>
```

**Step 3: Adjust styling**
- Remove `space-y-*` from parent (VirtualList handles gaps)
- Add explicit height to VirtualList
- Ensure DocumentCard has consistent height or use dynamic estimation

**Step 4: Test with large dataset**
```typescript
// In development, test with 1000+ items
const mockDocuments = Array.from({ length: 1000 }, (_, i) => ({
  id: `doc-${i}`,
  title: `Document ${i}`,
  // ... other fields
}));
```

---

## 🔨 PATTERN 2: Tasks Table (VirtualTable)

### Current Implementation

**File:** `src/pages/tasks.tsx`

```typescript
// CURRENT
export function TasksPage() {
  const { data: tasks } = useTasks();
  
  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Assignee</th>
          <th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map(task => (
          <tr key={task.id}>
            <td>{task.title}</td>
            <td><StatusBadge status={task.status} /></td>
            <td><Avatar user={task.assignee} /></td>
            <td>{task.dueDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Virtual Implementation

```typescript
// OPTIMIZED
import { VirtualTable } from '@/components/virtual/VirtualTable';
import type { ColumnDef } from '@tanstack/react-table';

export function TasksPage() {
  const { data: tasks } = useTasks();
  
  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => <Avatar user={row.original.assignee} />,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
  ];

  return (
    <VirtualTable
      data={tasks}
      columns={columns}
      estimateSize={() => 72}  // Row height
      className="h-[calc(100vh-12rem)]"
    />
  );
}
```

### Step-by-Step Integration

**Step 1: Define columns**
```typescript
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => row.original.title,
  },
  // ... more columns
];
```

**Step 2: Replace table with VirtualTable**
```typescript
<VirtualTable
  data={tasks}
  columns={columns}
  estimateSize={() => 72}  // Measure actual row height
  className="h-[calc(100vh-12rem)]"
/>
```

**Step 3: Add sorting/filtering (optional)**
```typescript
const [sorting, setSorting] = useState<SortingState>([]);
const [filtering, setFiltering] = useState('');

<VirtualTable
  data={tasks}
  columns={columns}
  sorting={sorting}
  onSortingChange={setSorting}
  globalFilter={filtering}
  onGlobalFilterChange={setFiltering}
/>
```

---

## 🔨 PATTERN 3: Knowledge Repositories (VirtualGrid)

### Current Implementation

**File:** `src/pages/knowledge/repositories.tsx`

```typescript
// CURRENT
export function RepositoriesPage() {
  const { data: repos } = useRepositories();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map(repo => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
```

### Virtual Implementation

```typescript
// OPTIMIZED
import { VirtualGrid } from '@/components/virtual/VirtualGrid';

export function RepositoriesPage() {
  const { data: repos } = useRepositories();
  
  return (
    <VirtualGrid
      items={repos}
      columns={{
        mobile: 1,
        tablet: 2,
        desktop: 3,
      }}
      estimateSize={() => 200}  // Card height
      renderItem={(repo) => <RepoCard repo={repo} />}
      className="h-[calc(100vh-12rem)]"
      gap={16}
    />
  );
}
```

---

## 📊 PERFORMANCE MEASUREMENT

### Before Integration

```bash
# Measure baseline
pnpm dev
# Open Chrome DevTools > Performance
# Start recording
# Navigate to /documents with 1000+ items
# Stop recording

# Look for:
# - Initial render time
# - Memory usage (Chrome Task Manager)
# - FPS during scrolling
```

**Expected Baseline:**
- Initial render: 600-800ms
- Memory: 40-60MB
- Scroll FPS: 30-40fps

### After Integration

**Expected Optimized:**
- Initial render: 60-100ms (8-10x faster)
- Memory: 4-8MB (90% reduction)
- Scroll FPS: 60fps (smooth)

### Measurement Script

```typescript
// Add to page for testing
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(`Render time: ${duration.toFixed(2)}ms`);
  };
}, []);
```

---

## ✅ TESTING CHECKLIST

### Pre-Integration
- [ ] Measure baseline performance (render time, memory, FPS)
- [ ] Take screenshots of current UI
- [ ] Document current behavior
- [ ] Create test dataset (1000+ items)

### During Integration
- [ ] Import correct virtual component
- [ ] Set appropriate estimateSize (measure actual heights)
- [ ] Set explicit height on container
- [ ] Remove conflicting CSS (space-y, grid)
- [ ] Test with empty list
- [ ] Test with 1 item
- [ ] Test with 100 items
- [ ] Test with 1000+ items

### Post-Integration
- [ ] Visual comparison (before vs after)
- [ ] Measure optimized performance
- [ ] Test search/filter functionality
- [ ] Test sorting (if applicable)
- [ ] Test on mobile devices
- [ ] Test with real data
- [ ] Verify accessibility (keyboard navigation)
- [ ] Check memory usage (Chrome Task Manager)

### Regression Testing
- [ ] All existing features still work
- [ ] Click handlers work correctly
- [ ] Hover states work
- [ ] Selection works (if applicable)
- [ ] Infinite scroll works (if applicable)

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: Items jumping during scroll

**Cause:** Inconsistent item heights  
**Solution:** Use dynamic size estimation

```typescript
// Instead of fixed height:
estimateSize={() => 120}

// Use dynamic calculation:
estimateSize={(index) => {
  const item = items[index];
  // Calculate based on content
  return item.description ? 150 : 100;
}}
```

### Issue 2: Scroll position resets

**Cause:** Items array identity changes  
**Solution:** Memoize items array

```typescript
const memoizedItems = useMemo(() => documents, [documents]);

<VirtualList items={memoizedItems} ... />
```

### Issue 3: Poor scroll performance

**Cause:** Heavy render function  
**Solution:** Memoize item component

```typescript
const MemoizedCard = memo(DocumentCard);

<VirtualList
  renderItem={(doc) => <MemoizedCard document={doc} />}
/>
```

### Issue 4: Container height not working

**Cause:** Parent has no explicit height  
**Solution:** Add height to parent or use viewport calculation

```typescript
// Option 1: Explicit height
<div className="h-screen">
  <VirtualList className="h-full" />
</div>

// Option 2: Calc from viewport
<VirtualList className="h-[calc(100vh-200px)]" />
```

---

## 📋 INTEGRATION PRIORITY

### High Priority (Week 4)
1. **documents.tsx** - Most impactful (500-2000 items)
2. **tasks.tsx** - High traffic page

### Medium Priority (Post-Launch)
3. **knowledge/repositories.tsx** - Medium traffic

### Low Priority (Future Sprints)
4. Other list pages as needed

---

## 🎯 SUCCESS CRITERIA

**Integration is successful when:**

1. **Performance:**
   - Initial render < 100ms
   - Memory usage < 10MB
   - Scroll at 60fps

2. **Functionality:**
   - All features work (search, filter, sort)
   - Click handlers work
   - Keyboard navigation works

3. **UX:**
   - Visual appearance unchanged
   - Smooth scrolling
   - No jumpiness or flashing

4. **Quality:**
   - No console errors
   - No accessibility regressions
   - Works on all devices

---

## 🚀 DEPLOYMENT STRATEGY

### Stage 1: Development Testing (1-2 days)
- Integrate on one page
- Test thoroughly
- Measure performance
- Fix issues

### Stage 2: Staging Deployment (2-3 days)
- Deploy to staging
- Monitor for issues
- Gather user feedback
- Performance validation

### Stage 3: Production Rollout (Gradual)
- Deploy to 10% of users
- Monitor metrics
- Increase to 50%
- Full rollout if stable

### Rollback Plan
```typescript
// Easy rollback - comment out virtual component
// <VirtualList ... />

// Restore original
{documents.map(doc => <DocumentCard key={doc.id} document={doc} />)}
```

---

## 📚 REFERENCES

- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [React Virtual Examples](https://tanstack.com/virtual/latest/docs/examples/react/table)
- Week 3 Performance Implementation: `WEEK_3_PERFORMANCE_COMPLETE.md`
- Example Components: `src/pages/documents-example.tsx`, `src/pages/tasks-example.tsx`

---

**Last Updated:** 2025-11-28  
**Status:** Documentation complete, ready for integration  
**Next Step:** Test on one page in development environment
