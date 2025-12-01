# Knowledge Base Makefile
# Quick commands for managing the accounting knowledge base

.PHONY: help kb-setup kb-migrate kb-ingest kb-test kb-stats kb-clean

help:
	@echo "Accounting Knowledge Base - Make Commands"
	@echo ""
	@echo "Setup & Migration:"
	@echo "  make kb-setup        - Install dependencies and run migration"
	@echo "  make kb-migrate      - Apply database migration"
	@echo ""
	@echo "Data Management:"
	@echo "  make kb-ingest       - Ingest knowledge sources"
	@echo "  make kb-list         - List all knowledge sources"
	@echo "  make kb-stats        - Show knowledge base statistics"
	@echo ""
	@echo "Testing:"
	@echo "  make kb-test         - Test search functionality"
	@echo "  make kb-test-all     - Run all test queries"
	@echo "  make kb-examples     - Run example integrations"
	@echo ""
	@echo "Maintenance:"
	@echo "  make kb-freshness    - Check document freshness"
	@echo "  make kb-clean        - Clean up old documents (dry-run)"
	@echo "  make kb-backup       - Export sources to JSON"
	@echo ""

# Setup
kb-setup:
	@echo "📦 Installing dependencies..."
	pnpm install @supabase/supabase-js openai pdf-parse yaml commander
	@echo "✅ Dependencies installed"
	@make kb-migrate

kb-migrate:
	@echo "🗄️  Applying database migration..."
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "❌ DATABASE_URL not set"; \
		exit 1; \
	fi
	psql "$$DATABASE_URL" -f supabase/migrations/20251201170000_accounting_knowledge_base.sql
	@echo "✅ Migration applied"

# Data Management
kb-ingest:
	@echo "📥 Starting knowledge ingestion..."
	@if [ -z "$$OPENAI_API_KEY" ] || [ -z "$$SUPABASE_URL" ]; then \
		echo "❌ Required env vars not set (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"; \
		exit 1; \
	fi
	pnpm tsx scripts/knowledge/ingest.ts

kb-list:
	@pnpm tsx scripts/knowledge/manage.ts list-sources

kb-stats:
	@pnpm tsx scripts/knowledge/test-search.ts --stats

# Testing
kb-test:
	@echo "🔍 Testing search..."
	@pnpm tsx scripts/knowledge/test-search.ts "How do I account for foreign exchange gains?"

kb-test-all:
	@echo "🧪 Running all test queries..."
	@pnpm tsx scripts/knowledge/test-search.ts --test-all

kb-examples:
	@echo "📚 Running example integrations..."
	@pnpm tsx scripts/knowledge/examples.ts

# Maintenance
kb-freshness:
	@echo "🕐 Checking document freshness..."
	@pnpm tsx scripts/knowledge/manage.ts check-freshness

kb-clean:
	@echo "🧹 Cleaning up old documents (dry-run)..."
	@pnpm tsx scripts/knowledge/manage.ts cleanup --dry-run

kb-backup:
	@echo "💾 Backing up knowledge sources..."
	@pnpm tsx scripts/knowledge/manage.ts export-sources

# Testing
kb-test-suite:
	@echo "🧪 Running comprehensive test suite..."
	@pnpm tsx test-suite.ts

# Docker
kb-docker-build:
	@echo "🐳 Building Docker image..."
	@cd ../.. && docker build -t prisma-knowledge-api -f scripts/knowledge/Dockerfile .

kb-docker-up:
	@echo "🐳 Starting Docker services..."
	@docker-compose up -d

kb-docker-down:
	@echo "🐳 Stopping Docker services..."
	@docker-compose down

kb-docker-logs:
	@docker-compose logs -f

# Deployment
kb-deploy:
	@echo "🚀 Running deployment script..."
	@./deploy.sh

# Development shortcuts
kb-dev: kb-stats kb-test

kb-full: kb-setup kb-ingest kb-test-all kb-stats kb-test-suite
