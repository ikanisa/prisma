# Local Caddy + Cloudflare Tunnel Runbook

This runbook describes how to expose your macOS development stack through a Cloudflare Tunnel secured by Cloudflare Access, with Caddy acting as the local reverse proxy. It assumes you already have the Prisma Glow services running on `localhost` as described in [`docs/local-hosting.md`](./local-hosting.md).

> **Secrets**
> Replace placeholders such as `<YOUR_CLOUDFLARE_TUNNEL_TOKEN>` or `<YOUR_SUPABASE_PROJECT_REF>` with the values shared through the secure vault. Do **not** commit real credentials.

## 1. Install tooling (macOS)

1. Install Homebrew if it is not already available:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install Caddy and Cloudflared:
   ```bash
   brew install caddy cloudflared
   ```
3. Confirm binaries are available:
   ```bash
   which caddy
   which cloudflared
   ```

> **Linux note (optional)**: Use your distribution package manager (e.g., `apt install caddy cloudflared`) or download the official tarballs from the vendor websites.

## 2. Configure Caddy for local services

Create `~/Library/Application Support/Caddy/Caddyfile` (or update your existing file) with the following baseline configuration:

```caddyfile
# Reverse proxy Prisma Glow services through a single HTTPS origin.
app.local.prisma-glow.test {
  tls internal

  @webui {
    path /app* /_next/*
  }
  handle @webui {
    reverse_proxy http://localhost:3000
  }

  @gateway {
    path /api/*
  }
  handle @gateway {
    reverse_proxy http://localhost:3001
  }

  handle {
    reverse_proxy http://localhost:5173
  }
}
```

- Adjust port targets if your local processes use alternate ports.
- Map the Caddy hostname to `127.0.0.1` so browsers and the tunnel can reach your local proxy:
  ```bash
  sudo sh -c 'echo "127.0.0.1 app.local.prisma-glow.test" >> /etc/hosts'
  ```
- The `tls internal` directive issues a local CA certificate. Trust the generated certificate via:
  ```bash
  sudo security add-trust -d -r trustAsRoot -k /Library/Keychains/System.keychain \
    /usr/local/etc/caddy/certificates/local/app.local.prisma-glow.test.crt
  ```

Start Caddy as a background service so that certificates renew automatically:
```bash
sudo brew services start caddy
```

## 3. Create and run a Cloudflare Tunnel

1. Authenticate with Cloudflare (opens a browser window):
   ```bash
   cloudflared tunnel login
   ```
2. Create a tunnel identifier:
   ```bash
   cloudflared tunnel create prisma-glow-local
   ```
   Store the generated tunnel ID as `<YOUR_CLOUDFLARE_TUNNEL_ID>`.
3. Save the credentials file path returned by the previous command. It will be referenced as `<YOUR_CLOUDFLARE_TUNNEL_CREDENTIALS_PATH>`.
4. Create `~/.cloudflared/prisma-glow-local.yml`:
   ```yaml
   tunnel: <YOUR_CLOUDFLARE_TUNNEL_ID>
   credentials-file: <YOUR_CLOUDFLARE_TUNNEL_CREDENTIALS_PATH>

   ingress:
     - hostname: app.dev.prisma-glow.com
       service: https://app.local.prisma-glow.test
     - service: http_status:404
   ```
5. Create a DNS record that points the public hostname to the tunnel:
   ```bash
   cloudflared tunnel route dns prisma-glow-local app.dev.prisma-glow.com
   ```
   Alternatively, create the equivalent CNAME record (`app.dev.prisma-glow.com` → `prisma-glow-local.cloudflare-gateway.com`) in the Cloudflare dashboard.
6. Run the tunnel:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=<YOUR_CLOUDFLARE_TUNNEL_TOKEN> \
   cloudflared tunnel run prisma-glow-local
   ```
   Leave this process running in a dedicated terminal during development.

> **Linux note (optional)**: Replace the launchd `brew services` command with `systemctl` or `supervisord` service definitions. The `cloudflared` configuration is otherwise identical.

## 4. Configure Cloudflare Access

1. Sign in to the Cloudflare dashboard and open **Zero Trust → Access → Applications**.
2. Create a new **Self-hosted** application with:
   - **Application name**: `Prisma Glow Local`
   - **Domain**: `app.dev.prisma-glow.com`
   - **Session duration**: match the security team recommendation.
3. Under **Policies**, add an **Allow** policy targeting the engineering group or specific user emails.
4. Optionally configure **Service Auth** if automated tests require headless access. Use service tokens and store `<YOUR_CF_ACCESS_CLIENT_ID>` / `<YOUR_CF_ACCESS_CLIENT_SECRET>` in the secrets manager.
5. Save the application. Access policies apply immediately to the tunnel hostname.

## 5. Supabase CORS considerations

Update the Supabase project settings to allow the tunneled hostname:

1. Navigate to **Settings → API → Allowed Origins** in the Supabase dashboard.
2. Add `https://app.dev.prisma-glow.com` and the internal Caddy domain `https://app.local.prisma-glow.test`.
3. If you rotate the tunnel hostname, repeat the update to avoid 403 responses.
4. Keep `localhost` entries for direct development access.

Document the changes in the shared Supabase change log to keep the backend team informed.

## 6. Rollback procedure

Follow these steps to roll back the tunnel and Caddy configuration:

1. Stop the tunnel process with `Ctrl+C`, or run:
   ```bash
   cloudflared tunnel cleanup prisma-glow-local
   ```
2. Disable the macOS launch agent for Caddy:
   ```bash
   sudo brew services stop caddy
   ```
3. Remove or comment the custom site block from your `Caddyfile`. Restart Caddy if you keep the service running for other sites.
4. Delete the DNS record created for `app.dev.prisma-glow.com` in the Cloudflare dashboard.
5. Revoke related Cloudflare Access policies or service tokens if they were scoped specifically for the tunnel.
6. Remove the Supabase allowed origins entry if you no longer need external access.

The environment now falls back to standard localhost-only development as documented in [`docs/local-hosting.md`](./local-hosting.md).

