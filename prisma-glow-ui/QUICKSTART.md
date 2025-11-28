# Prisma Glow UI - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Clone & Install
```bash
cd /your/project/directory
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

## 📖 Basic Usage

### Simple Page Example

```tsx
import { Container } from '@/components/layout/Container';
import { DataCard } from '@/components/ui/DataCard';

function MyPage() {
  return (
    <Container>
      <h1 className="text-display font-bold mb-6">My Page</h1>
      
      <DataCard hoverable>
        <DataCard.Metric
          label="Total Sales"
          value="$12,345"
          trend="up"
          trendValue="+12%"
        />
      </DataCard>
    </Container>
  );
}
```

### With Layout

```tsx
import { AdaptiveLayout } from '@/components/layout/AdaptiveLayout';
import { DashboardPage } from '@/pages/Dashboard';

function App() {
  return (
    <AdaptiveLayout>
      <DashboardPage />
    </AdaptiveLayout>
  );
}
```

## 🎨 Common Patterns

### Responsive Grid
```tsx
<Grid cols={3} gap="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

### Stack Layout
```tsx
<Stack direction="vertical" gap="lg">
  <Header />
  <Content />
  <Footer />
</Stack>
```

### Smart Input
```tsx
<SmartInput
  value={query}
  onChange={setQuery}
  aiSuggestions
  placeholder="Type to get AI suggestions..."
/>
```

### Empty State
```tsx
<EmptyState
  icon={FileText}
  title="No documents yet"
  description="Create your first document to get started"
  action={{
    label: 'Create Document',
    onClick: () => createDocument(),
  }}
/>
```

## ⌨️ Keyboard Shortcuts

- `⌘K` or `Ctrl+K` - Command palette
- `/` - Focus search
- `Esc` - Close modals
- `↑↓` - Navigate lists
- `Tab` - Accept AI suggestion

## 🎯 Key Files

```
src/
├── components/
│   ├── layout/          # Container, Grid, Stack, AdaptiveLayout
│   ├── ui/              # DataCard, EmptyState, SmartInput
│   └── smart/           # AI features
├── hooks/               # useResponsive, useLocalAI, etc.
├── pages/               # Your pages here
└── lib/                 # Utilities
```

## 🤖 AI Features

```tsx
// Use AI suggestions
const { loading, suggest } = useLocalAI();
await suggest(userInput, 'completion');

// Chat with AI
const { chat } = useLocalAI();
await chat('How do I create a task?');
```

## 🎨 Customization

### Colors
Edit `src/design/colors.ts`:
```ts
primary: {
  DEFAULT: '#8b5cf6',  // Your brand color
}
```

### Typography
Edit `src/design/tokens.ts`:
```ts
typography: {
  display: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
  },
}
```

## 📱 Mobile Support

The layout automatically adapts:
- **Mobile**: Bottom nav + hamburger menu
- **Desktop**: Fixed sidebar

Test responsive design:
```bash
# Open DevTools (F12)
# Click device toolbar (Ctrl+Shift+M)
# Test different screen sizes
```

## 🧪 Testing

```bash
# Run tests
npm test

# UI test mode
npm run test:ui

# Type checking
npm run type-check
```

## 🚢 Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 🆘 Troubleshooting

### Types not found?
```bash
npm install -D @types/react @types/react-dom
```

### Tailwind not working?
Make sure `tailwind.config.js` and `postcss.config.js` exist.

### Dark mode not working?
Add `class="dark"` to `<html>` tag for dark mode.

## 📚 Learn More

- [Full Documentation](./README.md)
- [Implementation Guide](./IMPLEMENTATION.md)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🎉 You're Ready!

Start building amazing UIs with Prisma Glow! 🚀

Need help? Check the examples in `src/pages/Dashboard.tsx`
