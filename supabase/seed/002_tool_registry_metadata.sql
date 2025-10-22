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
            'recipients', jsonb_build_object(
              'type', 'array',
              'description', 'Array of user IDs that should receive the notification',
              'items', jsonb_build_object('type', 'string', 'format', 'uuid'),
              'minItems', 1
            ),
            'userId', jsonb_build_object(
              'type', 'string',
              'format', 'uuid',
              'description', 'Single-recipient fallback (deprecated; prefer recipients array)'
            ),
            'message', jsonb_build_object('type', 'string', 'description', 'Notification message body'),
            'title', jsonb_build_object('type', 'string', 'description', 'Optional notification title'),
            'link', jsonb_build_object('type', 'string', 'format', 'uri', 'description', 'Optional link to include with the notification'),
            'urgency', jsonb_build_object(
              'type', 'string',
              'description', 'Urgency routing hint (critical marks the notification as urgent)',
              'enum', jsonb_build_array('info', 'warning', 'critical')
            ),
            'kind', jsonb_build_object(
              'type', 'string',
              'description', 'Inbox category for filtering',
              'enum', jsonb_build_array('TASK', 'DOC', 'APPROVAL', 'SYSTEM')
            )
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
          when 'notify.user' then jsonb_build_array('message')
          when 'docs.sign_url' then jsonb_build_array('documentId')
          else '[]'::jsonb
        end
    ),
    'sensitive', sensitive,
    'standardsRefs', standards_refs,
    'fanoutChannels', case key when 'notify.user' then jsonb_build_array('email', 'sms') else null end,
    'urgencyFanout', case key when 'notify.user' then 'critical/high urgency triggers webhook fan-out' else null end
  ))
where metadata is null or jsonb_typeof(metadata) <> 'object';
