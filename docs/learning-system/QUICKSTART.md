# Agent Learning System - Implementation Guide

## Overview

The Agent Learning System enables continuous improvement of AI agents through feedback, training, and experimentation.

## Quick Start

### 1. Database Setup

```bash
psql $DATABASE_URL -f migrations/sql/20251128133000_agent_learning_system.sql
```

### 2. Verify Installation

```bash
psql $DATABASE_URL -c "\dt learning_*"
psql $DATABASE_URL -c "\dt agent_feedback"
```

## Documentation

See full documentation in `docs/learning-system/README.md`

## Resources

- Migration: `migrations/sql/20251128133000_agent_learning_system.sql`
- Python: `server/learning/`
- React: `src/components/learning/`
- API: `server/api/learning.py`
