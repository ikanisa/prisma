-- First create all required extensions and types
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS app;

-- Create the enums first
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('admin','manager','staff','client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE engagement_status AS ENUM ('planned','active','completed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('info','warn','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;