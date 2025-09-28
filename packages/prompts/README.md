# Prompt library

Structured prompts for accounting and auditing tasks. Each JSON file conforms to `schema.json`.

## Available prompts

- `rag_qa.json` – answer questions using retrieved context.
- `audit_planning.json` – summarise audit planning considerations.
- `autocat.json` – categorise transactions.
- `vat_determine.json` – determine VAT rate and rationale.
- `materiality.json` – compute materiality threshold.
- `anomaly_explain.json` – explain anomalies and suggest actions.

## Usage

1. Load the desired prompt file.
2. Collect input matching the `input_schema`.
3. Populate the `user` template with those values.
4. Provide the `system` and formatted `user` messages to the language model.
5. Validate the model response against `output_schema`.

### Validate prompt files

```bash
npx ajv-cli validate -s schema.json \
  -d rag_qa.json \
  -d audit_planning.json \
  -d autocat.json \
  -d vat_determine.json \
  -d materiality.json \
  -d anomaly_explain.json
```
