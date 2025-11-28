insert into public.tool_registry (key, label, description, min_role, sensitive, standards_refs, enabled, metadata, org_id)
values
  (
    'rag.search',
    'Knowledge base search',
    'Retrieves indexed knowledge base content for grounding agent responses.',
    'EMPLOYEE',
    false,
    '{}'::text[],
    true,
    '{}'::jsonb,
    null
  ),
  (
    'trial_balance.get',
    'Trial balance snapshot',
    'Fetches the latest trial balance summary for quick diagnostics.',
    'EMPLOYEE',
    false,
    '{}'::text[],
    true,
    '{}'::jsonb,
    null
  ),
  (
    'docs.sign_url',
    'Generate document signing URL',
    'Generates a short-lived signing link for client deliverables.',
    'MANAGER',
    true,
    array['ISA 230'],
    true,
    '{}'::jsonb,
    null
  ),
  (
    'notify.user',
    'Notify user',
    'Sends an in-app notification to selected recipients.',
    'EMPLOYEE',
    false,
    '{}'::text[],
    true,
    '{}'::jsonb,
    null
  ),
  (
    'document.vision_ocr',
    'Document OCR (Vision)',
    'Extracts legible text from document images using OpenAI Vision models.',
    'EMPLOYEE',
    false,
    '{}'::text[],
    true,
    jsonb_build_object(
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'url', jsonb_build_object('type', 'string', 'format', 'uri', 'description', 'Public or signed URL for the document image'),
          'instructions', jsonb_build_object('type', 'string', 'description', 'Optional extraction guidance for the model'),
          'language', jsonb_build_object('type', 'string', 'description', 'Optional response language hint, e.g. en-US or fr'),
          'model', jsonb_build_object('type', 'string', 'description', 'Optional override for the vision model')
        ),
        'required', jsonb_build_array('url')
      )
    ),
    null
  )
on conflict (key, org_id) do update
set
  label = excluded.label,
  description = excluded.description,
  min_role = excluded.min_role,
  sensitive = excluded.sensitive,
  standards_refs = excluded.standards_refs,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();
