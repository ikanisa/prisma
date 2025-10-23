SHELL := /bin/bash

# Derive a short git SHA; default to dev when git metadata is unavailable
VERSION := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
export SERVICE_VERSION ?= $(VERSION)

# Compose controls
COMPOSE_ENV ?= .env.compose
FRONTEND_PROFILE ?= web
FRONTEND_SERVICE := $(if $(filter $(FRONTEND_PROFILE),web),web,ui)

.PHONY: print-version compose-dev-up compose-dev-down compose-dev-logs images-build compose-prod-up compose-prod-down compose-prod-logs compose-prod-set-tag compose-prod-rollback deps admin caddy-up caddy-bg caddy-down tunnel-up tunnel-bg tunnel-down

print-version:
	@echo "SERVICE_VERSION=$(SERVICE_VERSION)"

# Start local dev stack
compose-dev-up:
	@echo "Starting dev stack with SERVICE_VERSION=$(SERVICE_VERSION)"
	docker compose -f docker-compose.dev.yml up -d --build

compose-dev-down:
	docker compose -f docker-compose.dev.yml down -v

compose-dev-logs:
	docker compose -f docker-compose.dev.yml logs -f gateway rag agent analytics $(FRONTEND_SERVICE) || true

# Build images locally and tag with SERVICE_VERSION under the local namespace
images-build:
	@echo "Building images with SERVICE_VERSION=$(SERVICE_VERSION)"
	docker build -f gateway/Dockerfile   --build-arg SERVICE_VERSION=$(SERVICE_VERSION) -t local/gateway:$(SERVICE_VERSION) .
	docker build -f rag/Dockerfile       --build-arg SERVICE_VERSION=$(SERVICE_VERSION) -t local/rag:$(SERVICE_VERSION) .
	docker build -f agent/Dockerfile     --build-arg SERVICE_VERSION=$(SERVICE_VERSION) -t local/agent:$(SERVICE_VERSION) .
	docker build -f analytics/Dockerfile --build-arg SERVICE_VERSION=$(SERVICE_VERSION) -t local/analytics:$(SERVICE_VERSION) .
	docker build -f ui/Dockerfile        --build-arg SERVICE_VERSION=$(SERVICE_VERSION) -t local/ui:$(SERVICE_VERSION) .

# Production compose helpers
compose-prod-up:
	@echo "Starting prod compose with profile=$(FRONTEND_PROFILE) env=$(COMPOSE_ENV)"
	docker compose --env-file $(COMPOSE_ENV) --profile $(FRONTEND_PROFILE) -f docker-compose.prod.yml up -d

compose-prod-down:
	@echo "Stopping prod compose with profile=$(FRONTEND_PROFILE) env=$(COMPOSE_ENV)"
	docker compose --env-file $(COMPOSE_ENV) --profile $(FRONTEND_PROFILE) -f docker-compose.prod.yml down

compose-prod-logs:
	docker compose --env-file $(COMPOSE_ENV) --profile $(FRONTEND_PROFILE) -f docker-compose.prod.yml logs -f gateway rag agent analytics $(FRONTEND_SERVICE) || true

# Update all image tags in COMPOSE_ENV to a new tag (e.g., a commit SHA)
# Usage: make compose-prod-set-tag TAG=<sha>
compose-prod-set-tag:
	@if [[ -z "$(TAG)" ]]; then echo "TAG is required, e.g. make compose-prod-set-tag TAG=abc123" >&2; exit 1; fi
	bash scripts/deploy/update-compose-env.sh $(COMPOSE_ENV) $(TAG)

# Roll back by setting a previous tag and restarting
# Usage: make compose-prod-rollback ROLLBACK_TAG=<sha> FRONTEND_PROFILE=web
compose-prod-rollback:
	@if [[ -z "$(ROLLBACK_TAG)" ]]; then echo "ROLLBACK_TAG is required, e.g. make compose-prod-rollback ROLLBACK_TAG=abc123" >&2; exit 1; fi
	$(MAKE) compose-prod-set-tag TAG=$(ROLLBACK_TAG) COMPOSE_ENV=$(COMPOSE_ENV)
	$(MAKE) compose-prod-up COMPOSE_ENV=$(COMPOSE_ENV) FRONTEND_PROFILE=$(FRONTEND_PROFILE)

deps:
	./scripts/dev/deps.sh

admin:
	pnpm build
	pnpm start

caddy-up:
	./scripts/dev/caddy-up.sh

caddy-bg:
	./scripts/dev/caddy-bg.sh

caddy-down:
	./scripts/dev/caddy-down.sh

tunnel-up:
	./scripts/dev/tunnel-up.sh

tunnel-bg:
	./scripts/dev/tunnel-bg.sh

tunnel-down:
	./scripts/dev/tunnel-down.sh
