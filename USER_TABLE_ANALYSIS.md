# User Table Analysis Report

**Generated:** 2025-01-03

**Purpose:** Analyze user-related tables for consolidation planning

## Current User Tables


### PROFILES


#### `public.profiles`
- **Defined In:** `001_initial_schema.sql`
- **Schema:** `public`
- **Columns:** 4

**Column Definitions:**
  - `avatar_url`: `TEXT`
  - `email`: `TEXT UNIQUE NOT NULL`
  - `full_name`: `TEXT`
  - `metadata`: `JSONB DEFAULT '{}'`

**Raw Definition (first 500 chars):**
```sql

  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agent')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()

```

### USERS


#### `public.users`
- **Defined In:** `20250821115117_.sql`
- **Schema:** `public`
- **Columns:** 4

**Column Definitions:**
  - `avatar_url`: `TEXT`
  - `email`: `TEXT UNIQUE NOT NULL`
  - `is_system_admin`: `BOOLEAN DEFAULT false`
  - `name`: `TEXT`

**Raw Definition (first 500 chars):**
```sql

  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_system_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()

```

### APP_USERS


#### `public.app_users`
- **Defined In:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Schema:** `public`
- **Columns:** 2

**Column Definitions:**
  - `email`: `text NOT NULL UNIQUE`
  - `full_name`: `text`

**Raw Definition (first 500 chars):**
```sql

  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()

```

## Membership Tables


### MEMBERSHIPS


#### `public.memberships`
- **Defined In:** `20250821115117_.sql`
- **Schema:** `public`
- **Columns:** 1

**Column Definitions:**
  - `role`: `public.role_level NOT NULL DEFAULT 'EMPLOYEE'`

### MEMBERS


#### `public.members`
- **Defined In:** `20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- **Schema:** `public`
- **Columns:** 1

**Column Definitions:**
  - `role`: `org_role NOT NULL DEFAULT 'staff'`

## Consolidation Strategy


### Target Schema


**Consolidated User Table: `public.users`**

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_system_admin BOOLEAN DEFAULT false,
  role TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Consolidated Membership Table: `public.memberships`**

```sql
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'EMPLOYEE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);
```