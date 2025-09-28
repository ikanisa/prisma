Deno.serve((req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') ?? 'mock';
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/services/connectors/callback`;
  const oauthUrl = `https://example.com/oauth/authorize?client_id=stub&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&provider=${provider}`;
  return new Response(JSON.stringify({ url: oauthUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
