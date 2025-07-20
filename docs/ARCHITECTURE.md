# EasyMO Admin Panel - Architecture Documentation

## Overview

EasyMO is a WhatsApp-only super-app for payments, produce, rides, and events. This admin panel provides internal operations management with a comprehensive web interface built on React, TypeScript, and Supabase.

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with custom design system
- **shadcn/ui** component library
- **TanStack Query** for data fetching
- **React Router Dom** for routing

### Backend
- **Supabase** for database, auth, and edge functions
- **PostgreSQL** with PostGIS extensions
- **Row Level Security (RLS)** for data access control
- **Edge Functions** for serverless compute

### State Management
- **TanStack Query** for server state
- **React Context** for global app state
- **Local State** with useState/useReducer

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── admin/              # Admin-specific components
│   └── shared/             # Reusable components
├── pages/
│   └── admin/              # Admin page components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── integrations/
│   └── supabase/           # Supabase client & types
└── types/                  # TypeScript type definitions
```

## Database Schema

### Core Tables

- **users** - User authentication and profiles
- **businesses** - Business entities and configurations
- **agents** - AI agent definitions
- **conversations** - Chat conversations and messages
- **orders** - Product orders and fulfillment
- **deliveries** - Delivery tracking and management
- **events** - Event management and bookings

### Analytics Tables

- **agent_execution_log** - AI agent performance metrics
- **conversation_analytics** - Chat analytics and KPIs
- **customer_satisfaction** - CSAT ratings and feedback

### Configuration Tables

- **cron_jobs** - Scheduled task definitions
- **alert_configurations** - System alerting rules
- **drip_sequences** - Marketing automation workflows

## Row Level Security (RLS)

All tables implement RLS with the following pattern:

```sql
-- Admin access
CREATE POLICY "admin_access" ON table_name FOR ALL USING (is_admin());

-- User access (where applicable)
CREATE POLICY "user_access" ON table_name FOR ALL 
USING (auth.uid() = user_id);
```

### Admin Function
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Edge Functions

### Standard Contract
All edge functions follow this pattern:

```typescript
interface EdgeFunctionRequest {
  action: string;
  payload?: any;
}

interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Error Handling
```typescript
try {
  // Function logic
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
} catch (error) {
  console.error('Function error:', error);
  return new Response(JSON.stringify({ 
    success: false, 
    error: error.message 
  }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

## React Component Standards

### Component Structure
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export default function Component({ ...props }: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState();
  const { data, isLoading } = useQuery();
  
  // Event handlers
  const handleAction = () => {};
  
  // Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className="space-y-6">
      {/* Component content */}
    </div>
  );
}
```

### Data Fetching Pattern
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('filter', value);
    
    if (error) throw error;
    return data;
  }
});
```

### Infinite Scroll Implementation
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['entities'],
  queryFn: async ({ pageParam = 0 }) => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .range(pageParam, pageParam + 49);
    
    if (error) throw error;
    return data;
  },
  getNextPageParam: (lastPage, pages) => 
    lastPage.length === 50 ? pages.length * 50 : undefined
});
```

## Design System

### Colors (HSL Values)
```css
:root {
  --primary: 222.2 84% 4.9%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 94%;
  --muted: 210 40% 96%;
  --destructive: 0 84.2% 60.2%;
}
```

### Component Variants
- Use `class-variance-authority` for variant management
- Define variants in component files, not inline
- Follow semantic naming conventions

## Performance Optimization

### Query Optimization
- Use React Query for caching and background updates
- Implement pagination for large datasets
- Use optimistic updates for better UX

### Code Splitting
- Lazy load admin pages
- Split large components into smaller modules
- Use dynamic imports for heavy dependencies

### Bundle Optimization
- Tree shake unused code
- Optimize images and assets
- Use appropriate bundle strategies

## Security Considerations

### Authentication
- JWT tokens with Supabase Auth
- Role-based access control
- Session management

### Data Protection
- RLS policies on all tables
- Input validation with Zod
- SQL injection prevention
- XSS protection

### API Security
- Rate limiting on edge functions
- Request validation
- Error message sanitization

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats RWF correctly', () => {
    expect(formatCurrency(1000)).toBe('RWF 1,000');
  });
});
```

### E2E Tests (Playwright)
```typescript
// admin-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('admin can view dashboard', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Edge Function Tests
```typescript
// function.test.ts
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Deno.test('function handles valid input', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/test', {
    method: 'POST',
    body: JSON.stringify({ action: 'test' })
  });
  
  assertEquals(response.status, 200);
});
```

## Deployment

### Environment Configuration
- Development: Local Supabase instance
- Staging: Supabase staging project
- Production: Supabase production project

### CI/CD Pipeline
1. Code push triggers build
2. Run tests (unit, integration, e2e)
3. Deploy edge functions
4. Deploy frontend to Vercel/Netlify
5. Run smoke tests
6. Notify team of deployment status

### Database Migrations
- Use Supabase CLI for migrations
- Version control all schema changes
- Test migrations in staging first

## Monitoring & Observability

### Logging
- Edge function execution logs
- Client-side error tracking
- Performance metrics

### Alerting
- Database performance alerts
- Edge function error rates
- User experience metrics

### Analytics
- User behavior tracking
- Feature usage analytics
- Performance benchmarking

## Contributing Guidelines

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use TypeScript strictly
- Write meaningful commit messages

### Pull Request Process
1. Create feature branch from main
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit PR with description
6. Address review feedback
7. Merge after approval

### Documentation
- Update README for setup changes
- Document new APIs and components
- Keep architecture docs current
- Write clear code comments

## Future Considerations

### Scalability
- Database connection pooling
- CDN for static assets
- Horizontal scaling strategies

### Performance
- Query optimization
- Caching strategies
- Asset optimization

### Security
- Regular security audits
- Dependency updates
- Penetration testing

### Maintenance
- Regular dependency updates
- Performance monitoring
- User feedback integration