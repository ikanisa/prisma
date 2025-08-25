import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getToken } from '../token-vault.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') ?? 'mock'
  const orgId = url.searchParams.get('org_id') ?? 'org-demo'

  const token = await getToken(provider, orgId)
  console.log(`Using token ${token} for provider ${provider}`)

  const externalTransactions = [
    {
      id: 'ext-1',
      amount: 100,
      currency: 'USD',
      description: 'Sample transaction',
      date: new Date().toISOString(),
    },
  ]

  const normalized = externalTransactions.map((t) => ({
    org_id: orgId,
    provider,
    external_id: t.id,
    amount: t.amount,
    currency: t.currency,
    description: t.description,
    transaction_date: t.date,
    raw_data: t,
  }))

  const { error } = await supabase.from('transactions').insert(normalized)

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, inserted: normalized.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
