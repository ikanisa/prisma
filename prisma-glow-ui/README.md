# Prisma Glow UI - Modern AI-First Design System

**Minimalist • Responsive • Fluid • Smart • AI-Powered**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.16-FF0055)](https://www.framer.com/motion/)

## 🎨 Design Philosophy

### Core Principles
1. **CLARITY** - Every element serves a purpose, no visual noise
2. **BREATHING** - Generous whitespace, comfortable reading experience
3. **FOCUS** - One primary action per view, clear hierarchy
4. **DELIGHT** - Subtle animations, smooth 60fps transitions
5. **INTELLIGENCE** - AI predicts & suggests, user confirms

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 📦 What's Included

### Design System Foundation
- ✅ **Design Tokens** (`src/design/tokens.ts`) - Spacing, typography, shadows, breakpoints
- ✅ **Color Palette** (`src/design/colors.ts`) - Purple primary + semantic neutrals
- ✅ **Animation Library** (`src/lib/animations.ts`) - Page transitions, stagger, slide-in
- ✅ **Utilities** (`src/lib/utils.ts`) - cn() helper, formatters, validators

### Custom Hooks
- ✅ **useResponsive** - Detect breakpoints & window size
- ✅ **useFocusTrap** - Accessibility for modals/dialogs
- ✅ **useKeyboardShortcuts** - Global keyboard shortcuts
- ✅ **useLocalAI** - AI suggestion & chat interface

### Layout Components
- ✅ **Container** - Fluid responsive container with size variants
- ✅ **Grid** - Responsive grid (1-4 columns, auto-fit)
- ✅ **Stack** - Flexible stack layout (vertical/horizontal)
- ✅ **AnimatedPage** - Page transition wrapper
- ✅ **AdaptiveLayout** - Complete app shell (desktop sidebar + mobile nav)

### Smart Components
- ✅ **FloatingAssistant** - Draggable AI chat assistant
- ✅ **CommandPalette** - ⌘K command search (like VS Code)
- ✅ **QuickActions** - AI-suggested contextual actions
- ✅ **SmartInput** - Input with AI autocomplete suggestions

### UI Components
- ✅ **DataCard** - Compound component for metrics/stats
- ✅ **EmptyState** - Elegant empty states with actions
- ✅ **SmartInput** - Input with AI suggestions dropdown

### Example Pages
- ✅ **Dashboard** - Complete dashboard with stats, cards, activity

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install framer-motion clsx tailwind-merge lucide-react

# Optional: AI features
npm install @tauri-apps/api  # For desktop AI integration
```

### Basic Usage

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

## 📐 Responsive Behavior

### Breakpoints
- **xs**: 0-639px (Mobile portrait)
- **sm**: 640-767px (Mobile landscape)
- **md**: 768-1023px (Tablet)
- **lg**: 1024-1279px (Desktop)
- **xl**: 1280-1535px (Large desktop)
- **2xl**: 1536px+ (Wide desktop)

### Adaptive Features
- **Mobile (xs-sm)**: Bottom navigation + hamburger menu
- **Tablet (md)**: Collapsible sidebar
- **Desktop (lg+)**: Fixed sidebar navigation

## 🎯 Component Patterns

### Compound Components

```tsx
<DataCard hoverable>
  <DataCard.Metric
    label="Active Users"
    value={1234}
    trend="up"
    trendValue="+12%"
  />
  <DataCard.Footer>
    <button>View Details</button>
  </DataCard.Footer>
</DataCard>
```

### Layout Composition

```tsx
<Container size="lg">
  <Stack direction="vertical" gap="lg">
    <Grid cols={3} gap="md">
      {/* Grid items */}
    </Grid>
  </Stack>
</Container>
```

### Smart Input with AI

```tsx
<SmartInput
  value={query}
  onChange={setQuery}
  aiSuggestions
  onAcceptSuggestion={(suggestion) => {
    console.log('Accepted:', suggestion);
  }}
/>
```

## ⌨️ Keyboard Shortcuts

- **⌘K / Ctrl+K** - Open command palette
- **/** - Focus search
- **Esc** - Close modals/dropdowns
- **↑↓** - Navigate lists
- **↵** - Select/confirm
- **Tab** - Accept AI suggestion

## 🎨 Theming

### Light/Dark Mode Support
All components automatically support dark mode via Tailwind's `dark:` variants.

```tsx
// Example color usage
<div className="bg-white dark:bg-neutral-900">
  <h1 className="text-neutral-900 dark:text-neutral-100">
    Hello World
  </h1>
</div>
```

### Custom Colors
Edit `src/design/colors.ts` to customize the color palette:

```ts
primary: {
  DEFAULT: '#8b5cf6',  // Change to your brand color
  hover: '#7c3aed',
  muted: 'rgba(139, 92, 246, 0.1)',
}
```

## 🤖 AI Features

### Local AI Integration
The `useLocalAI` hook provides:
- **suggest()** - Get AI suggestions for text
- **chat()** - Conversational AI assistant
- **analyze()** - Pattern detection & insights

```tsx
const { loading, suggest, chat } = useLocalAI();

// Get suggestions
await suggest(userInput, 'completion');

// Chat with AI
await chat('How do I create a task?');
```

### Gemini Integration (Optional)
For production, integrate Google Gemini API:

```ts
// src/services/gemini.ts
import { invoke } from '@tauri-apps/api/tauri';

export async function getGeminiSuggestion(text: string) {
  return invoke<string[]>('gemini_suggest', { text });
}
```

## 📱 Mobile Optimization

### Touch Gestures
- Swipe to open/close sidebars
- Pull-to-refresh on lists
- Long-press for context menus

### Performance
- Lazy loading for routes
- Virtual scrolling for long lists
- Image optimization (WebP + lazy load)
- Code splitting (<200KB initial bundle)

## ♿ Accessibility

### Features
- ✅ Skip links for keyboard navigation
- ✅ Focus trap in modals
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard shortcuts documented
- ✅ High contrast mode support
- ✅ Screen reader announcements

### Testing
```bash
# Run accessibility audit
npm run a11y

# Lighthouse CI
npm run lighthouse
```

## 🧪 Testing

### Component Tests
```tsx
import { render, screen } from '@testing-library/react';
import { DataCard } from '@/components/ui/DataCard';

test('renders metric correctly', () => {
  render(
    <DataCard>
      <DataCard.Metric label="Users" value={100} />
    </DataCard>
  );
  
  expect(screen.getByText('Users')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
});
```

## 📊 Performance Targets

- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.0s
- **Lighthouse Score**: 90+
- **Bundle Size**: <200KB (initial)
- **Animation FPS**: 60fps

## 🔧 Customization

### Typography
Edit `src/design/tokens.ts`:

```ts
typography: {
  display: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',  // Larger headings
    fontWeight: '700',
  },
}
```

### Spacing
Adjust the spacing scale:

```ts
spacing: {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
}
```

## 📁 File Structure

```
src/
├── design/              # Design tokens
│   ├── tokens.ts
│   └── colors.ts
├── components/
│   ├── layout/          # Layout components
│   │   ├── Container.tsx
│   │   ├── Grid.tsx
│   │   ├── Stack.tsx
│   │   ├── AnimatedPage.tsx
│   │   └── AdaptiveLayout.tsx
│   ├── ui/              # UI primitives
│   │   ├── DataCard.tsx
│   │   ├── EmptyState.tsx
│   │   └── SmartInput.tsx
│   └── smart/           # AI components
│       ├── FloatingAssistant.tsx
│       ├── CommandPalette.tsx
│       └── QuickActions.tsx
├── hooks/               # Custom hooks
│   ├── useResponsive.ts
│   ├── useFocusTrap.ts
│   ├── useKeyboardShortcuts.ts
│   └── useLocalAI.ts
├── lib/                 # Utilities
│   ├── animations.ts
│   └── utils.ts
└── pages/               # Page components
    └── Dashboard.tsx
```

## 🎯 Next Steps

### Phase 4: Advanced Features (Weeks 9-12)
- [ ] Drag & drop task boards
- [ ] Real-time collaboration cursors
- [ ] Voice command integration
- [ ] Advanced data visualization
- [ ] Offline mode with sync
- [ ] PWA installation

### Phase 5: Production Polish (Weeks 13-16)
- [ ] Performance optimization (<200ms P95)
- [ ] A/B testing framework
- [ ] Analytics integration
- [ ] Error boundary improvements
- [ ] Comprehensive E2E tests
- [ ] Documentation site

## 📚 Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Radix UI](https://www.radix-ui.com/) - For additional primitives

## 🤝 Contributing

1. Follow the component patterns shown in examples
2. Add TypeScript types for all props
3. Include accessibility features (ARIA, keyboard nav)
4. Write tests for new components
5. Document usage in component comments

## 📝 License

MIT - Build amazing UIs! 🚀

---

**Built with ❤️ for production-ready, minimalist design**
