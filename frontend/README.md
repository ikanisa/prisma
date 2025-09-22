- **Fleet Tracking**: GPS-enabled driver management
- **Order Tracking**: Real-time order status updates
- **Payment Processing**: MoMo integration and QR generation

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for data management
- **React Router** for navigation

### Backend
- **Supabase** with PostgreSQL
- **Row Level Security (RLS)** for data protection
- **Edge Functions** for business logic
- **Real-time subscriptions** for live updates

### Testing & Quality
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **GitHub Actions** for CI/CD
- **85%+ test coverage** requirement

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18
npm or bun
supabase account
```

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Supabase credentials

# Start development server
npm run dev
```

### Database Setup
```bash
# Apply migrations
supabase db push

# Seed sample data (optional)
npm run seed
```

## 📊 Architecture

### Data Flow
```
WhatsApp Business API → Edge Functions → Supabase → Admin UI
```

### Key Components
- **AdminLayoutConsolidated**: Main layout with navigation
- **UnifiedDashboard**: Central metrics and quick actions
- **AdminTable**: Reusable data table with CRUD operations
- **useUnifiedData**: Centralized data management hook

### Security
- **RLS Policies**: Database-level access control
- **Admin Authentication**: Secure admin-only access
- **API Protection**: Edge function security headers

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Coverage report
npm run coverage
```

### Quality Gates
- ✅ 85%+ test coverage
- ✅ TypeScript strict mode
- ✅ ESLint compliance
- ✅ Automated CI/CD pipeline

## 📈 Performance

### Optimizations
- **Code Splitting**: Lazy-loaded admin pages
- **Query Optimization**: Efficient database queries
- **Real-time Updates**: Minimal re-renders
- **Bundle Size**: Optimized for fast loading

## 🔧 Development

### File Structure
```
src/
├── components/admin/     # Admin-specific components
├── hooks/               # Custom React hooks  
├── pages/admin/         # Admin page components
├── integrations/        # Supabase integration
└── types/               # TypeScript definitions

supabase/
├── functions/           # Edge functions
└── migrations/          # Database schemas
```

### Key Conventions
- **Unified Data Management**: Single source of truth
- **Reusable Components**: DRY principle
- **Type Safety**: Full TypeScript coverage
- **Design System**: Consistent UI patterns

## 🌍 Deployment

### Production Build
```bash
npm run build
npm run preview
```

### Environment Setup
- Configure Supabase project
- Set up domain (optional)
- Apply database migrations
- Configure environment variables

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📚 Documentation

- [API Reference](docs/API_REFERENCE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## 🤝 Contributing

1. Follow the established patterns
2. Write tests for new features
3. Maintain type safety
4. Update documentation

## 📄 License

MIT License - see LICENSE file for details.

---

**easyMO Admin Panel** - Empowering Rwanda's digital economy through WhatsApp 🇷🇼

*Built with ❤️ using Lovable.dev*
