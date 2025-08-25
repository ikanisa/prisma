# n8n Workflows

This directory stores workflow definitions exported from an n8n instance.

## Exporting workflows

Run [`scripts/n8n_export.sh`](../scripts/n8n_export.sh) to download all workflows from the n8n API. The script requires two environment variables:

- `N8N_HOST`: base URL of the n8n instance (e.g. `https://n8n.example.com`).
- `N8N_API_KEY`: personal access token for the API.

The script writes each workflow to `exports/<workflow>-<id>.json`.

## Importing workflows

Use the n8n UI or API to import a workflow JSON file from the `exports` directory. This allows versioning of workflows in git.

## Environment separation

Keep exports for each environment (development, staging, production) in separate branches or repositories to avoid mixing environment-specific credentials. Configure distinct `N8N_HOST` and `N8N_API_KEY` values for each environment.
