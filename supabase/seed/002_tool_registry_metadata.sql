update public.tool_registry
set metadata = jsonb_strip_nulls(jsonb_build_object(
    'parameters', jsonb_build_object(
      'type', 'object',
      'properties', 
        case key
          when 'rag.search' then jsonb_build_object(
            'query', jsonb_build_object('type', 'string', 'description', 'Search query text'),
            'topK', jsonb_build_object('type', 'integer', 'minimum', 1, 'maximum', 20, 'description', 'Number of results')
          )
          when 'docs.sign_url' then jsonb_build_object(
            'documentId', jsonb_build_object('type', 'string', 'description', 'Target document identifier'),
            'expiresInMinutes', jsonb_build_object('type', 'integer', 'minimum', 5, 'maximum', 120, 'description', 'Minutes until link expiry')
          )
          when 'notify.user' then jsonb_build_object(
            'userId', jsonb_build_object('type', 'string', 'description', 'Recipient user identifier'),
            'message', jsonb_build_object('type', 'string', 'description', 'Notification message body')
          )
          when 'trial_balance.get' then jsonb_build_object(
            'period', jsonb_build_object('type', 'string', 'description', 'Accounting period (YYYY-MM)'),
            'orgId', jsonb_build_object('type', 'string', 'description', 'Organisation identifier')
          )
          else '{}'
        end,
      'required',
        case key
          when 'rag.search' then jsonb_build_array('query')
          when 'notify.user' then jsonb_build_array('userId', 'message')
          when 'docs.sign_url' then jsonb_build_array('documentId')
          else '[]'::jsonb
        end
    ),
    'sensitive', sensitive,
    'standardsRefs', standards_refs
  ))
where metadata is null or jsonb_typeof(metadata) <> 'object';
