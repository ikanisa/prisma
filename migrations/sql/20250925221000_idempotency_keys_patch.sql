-- Align idempotency storage with the new contract used by the app layer
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  resource text NOT NULL,
  idempotency_key text NOT NULL,
  request_id text,
  status_code integer NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'idempotency_keys'
      AND column_name = 'route'
  ) THEN
    EXECUTE 'ALTER TABLE public.idempotency_keys RENAME COLUMN route TO resource';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'idempotency_keys'
      AND column_name = 'key'
  ) THEN
    EXECUTE 'ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS idempotency_key text';
    EXECUTE 'UPDATE public.idempotency_keys SET idempotency_key = key WHERE idempotency_key IS NULL';
    EXECUTE 'ALTER TABLE public.idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_pkey';
    EXECUTE 'ALTER TABLE public.idempotency_keys DROP COLUMN key';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'idempotency_keys'
      AND column_name = 'id'
  ) THEN
    EXECUTE 'ALTER TABLE public.idempotency_keys ADD COLUMN id uuid DEFAULT gen_random_uuid()';
  END IF;
END
$$;

ALTER TABLE public.idempotency_keys
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN resource SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS status_code integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS response jsonb DEFAULT '{}'::jsonb;

UPDATE public.idempotency_keys SET status_code = COALESCE(status_code, 200);
UPDATE public.idempotency_keys SET response = COALESCE(response, '{}'::jsonb);

ALTER TABLE public.idempotency_keys
  ALTER COLUMN status_code SET NOT NULL,
  ALTER COLUMN response SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.idempotency_keys'::regclass
      AND conname = 'idempotency_keys_pkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.idempotency_keys ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id)';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_unique
  ON public.idempotency_keys (org_id, resource, idempotency_key);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "idem_rw" ON public.idempotency_keys;
DROP POLICY IF EXISTS "Allow service role idempotency access" ON public.idempotency_keys;
CREATE POLICY "Allow service role idempotency access"
  ON public.idempotency_keys
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
