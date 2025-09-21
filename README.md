# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Environment Setup

This project requires a few environment variables for Supabase.
Create a local `.env.local` file (ignored by git) by copying the provided `.env.example` and
filling in your project details:

```sh
cp .env.example .env.local
```

Required variables:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Testing

Run the Python test suites:

```bash
pytest
```

## Curl smoke tests

Assuming the service is running locally on port 8000:

```bash
# RAG ingest
curl -X POST http://localhost:8000/rag/ingest -H "Content-Type: application/json" -d '{"text":"sample"}'

# RAG search
curl "http://localhost:8000/rag/search?q=VAT"

# Agent routing
curl "http://localhost:8000/route?q=What%20is%20the%20current%20VAT%20rate%20in%20the%20UK?"

# VAT evaluator
curl -X POST http://localhost:8000/vat/evaluate -H "Content-Type: application/json" -d '{"question":"What is the current VAT rate in the UK?"}'

# Idempotent request
curl -X POST http://localhost:8000/process -H "Idempotency-Key: test-1" -d '{"payload":"data"}'

# Rate limit check
curl -I http://localhost:8000/ratelimit/test
```
