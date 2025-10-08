## Prisma Glow Web

This package contains the role-based web experience that complements the rest of the Prisma Glow
monorepo. It is powered by Next.js 14 with the App Router, Tailwind CSS, and shadcn/ui.

### Features

- **Opinionated landing page** that links into dedicated admin and member workspaces.
- **Role-based route stubs** located in `src/app/(roles)/*` so you can flesh out dashboards quickly.
- **Progressive Web App (PWA) support** with a manifest, custom icons, and a simple service worker
  registration component.
- **Shared design tokens** that mirror the rest of the repository via Tailwind CSS configuration and
  shadcn/ui primitives.

### Getting started

```bash
# install everything from the repository root
npm install

# start the Next.js workspace from the root
npm run dev:web
```

If you prefer to work directly from this directory you can still run:

```bash
npm install
npm run dev
```

The development server runs on [http://localhost:3000](http://localhost:3000). Update
`src/app/page.tsx`, the admin area (`src/app/(roles)/admin/page.tsx`), or the member area
(`src/app/(roles)/user/page.tsx`) to begin customizing the experience.

To verify the lint rules and ensure the PWA assets compile correctly, you can either use the root
workspace scripts:

```bash
npm run lint:web
npm run build:web
```

Or execute the commands locally in `apps/web` after running `npm install` here.

The production build emits a `.next` directory with the generated service worker manifest, which is
ignored by the repository-level ESLint configuration.
