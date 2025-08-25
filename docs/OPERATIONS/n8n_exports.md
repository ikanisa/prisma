# n8n workflow exports

Generate an API token in the n8n UI (Settings → API) and set the following environment variables before running the export script:

```bash
export N8N_HOST=https://n8n.example.com
export N8N_API_KEY=<your-token>
./scripts/n8n_export.sh
```

The script stores workflow files in `n8n/exports/`. Keep API tokens secure and do not commit them to version control.
