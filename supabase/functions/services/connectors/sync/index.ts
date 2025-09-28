import { getToken } from '../token-vault.ts'
import { getServiceSupabaseClient } from '../../_shared/supabase-client.ts'

const supabasePromise = getServiceSupabaseClient()

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') ?? 'mock'
  const orgId = url.searchParams.get('org_id') ?? 'org-demo'

  const token = await getToken(provider, orgId)
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: 'connector_token_missing', provider, orgId }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  console.log(`Using token ${token} for provider ${provider}`)

  const supabase = await supabasePromise

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
