# DAC6 Hallmark Assessment (T‑2B)

## References
- **EU Council Directive 2018/822 (DAC6)** – mandatory disclosure of cross-border arrangements.
- Commissioner for Revenue guidance on reporting obligations and hallmarks.

## Inputs captured
- Arrangement reference, description, first step date, disclosure due date.
- Participants (role, jurisdiction, TIN).
- Hallmarks (Category A–E, code, main benefit test indicator).
- Optional notes and metadata for subsequent filings.

## Workflow
1. Access `/tax/dac6` (manager role required).
2. Enter arrangement details, hallmarks, and participants.
3. The edge function `/functions/v1/tax-mt-nid` with `calculator=DAC6` assesses hallmarks via `src/lib/tax/dac6.ts` and persists the arrangement (`dac6_arrangements`, `dac6_hallmarks`, `dac6_participants`).
4. Activity log `DAC6_ASSESSED` records status (draft vs ready for submission) and rationale.
5. The history table shows recent arrangements with status tracking.

## Testing
- Hallmark logic covered by `tests/tax/dac6.test.ts`.
- Manual UI verification: create arrangement, verify history entry and status change.
