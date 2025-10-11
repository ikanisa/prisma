import { storeToken } from '../../token-vault.ts'

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const provider = url.searchParams.get('provider') ?? 'mock'
  const orgId = url.searchParams.get('org_id') ?? 'org-demo'

  if (!code) {
    return new Response(JSON.stringify({ success: false, error: 'Missing code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const accessToken = `token-${code}`
  await storeToken(provider, orgId, accessToken)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(handler)
