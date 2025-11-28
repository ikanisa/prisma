# Treaty Withholding & MAP/APA Tracker (T‑3A)

## References
- **OECD Model Tax Convention** – Articles 10–12 (Dividends, Interest, Royalties) & Article 23 (Avoidance of double taxation).
- **OECD MAP Manual** – Guidance on managing mutual agreement procedures.
- **EU Arbitration Convention (90/436/EEC)** – where applicable for transfer pricing disputes.

## Scope & Data model
- `treaty_wht_calculations` stores domestic vs treaty withholding comparisons, relief method, and metadata evidence.
- `tax_dispute_cases` registers MAP/APA cases (status, counterparty authority, relief expected/realised).
- `tax_dispute_events` captures timeline milestones for each dispute (submission, position paper, agreement, closure).
- ActivityLog actions `TREATY_WHT_COMPUTED` and `TAX_DISPUTE_EVENT_LOGGED` provide governance traceability (policy pack `T-GOV-1`).

## Workflow
1. Navigate to `/tax/treaty-wht` (manager role required).
2. Enter payment details (jurisdiction, payment type, gross amount, domestic/treaty rates) and compute relief. The edge function persists the calculation and logs the activity event.
3. Record MAP/APA disputes through the "Case management" card, specifying case type, counterpart authority, current status, and relief amount.
4. Log timeline events (e.g., submission, response, agreement) to maintain an auditable chronology.
5. Use the history and timeline tables to support evidence packs and board reporting.

## Testing
- Deterministic calculations covered in `tests/tax/calculators.test.ts` (`calculateTreatyWht`).
- Edge function branches exercised via Vitest API tests pending (add in future phase when integration harness is in place).
- Manual verification: compute a domestic 25% vs treaty 10% scenario and confirm stored relief equals €15k on €100k payment; create MAP case and log events.

## Evidence & Controls
- Treaty computations / disputes are guarded by Supabase RLS (`app.is_member_of`).
- ActivityLog metadata includes rates, relief amount, event type/date for downstream analytics.
- Dispute register can be exported for MAP annual reporting requirements.
