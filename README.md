# WhatsApp Agent Platform

This monorepo contains two main parts:

- **/frontend**: Existing admin panel (future UI layer)
- **/server**: Supabase Edge Functions backend with OpenAI Assistant SDK for WhatsApp integrations

See [docs/ROADMAP.md](docs/ROADMAP.md) for full refactor plan and implementation details.

## Performance Optimization
- Convert heavy admin routes in App.tsx to use React.lazy + Suspense for code splitting.

