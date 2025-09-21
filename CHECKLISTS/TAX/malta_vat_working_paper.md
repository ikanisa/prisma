# Malta VAT Working Paper

## Purpose
Document VAT return preparation, evidence, and review procedures for Malta VAT Act compliance.

## Sections

| Section | Purpose | Standards |
| --- | --- | --- |
| Control data | Capture VAT registration metadata, period, and due dates | TM-028 |
| Turnover reconciliation | Tie GL/POS turnover to return values with evidence attachments | TM-028 |
| Output VAT | Validate rate bands and calculator dominance guardrails before approval | TM-028, TM-024 |
| Input VAT | Substantiate recoverable input VAT and blocked items with schedules | TM-028 |
| EC Sales / Intrastat | Confirm EU reporting obligations and thresholds | TM-028 |
| Review & approval | Document preparer/reviewer sign-off and approval workflow | TM-029 |
| Filing package | Store return PDF, payment plan, and submission controls | TM-029 |

### 1. Control data
- Entity VAT number:
- Period covered:
- Return due date:

### 2. Turnover reconciliation
- Sales per GL / POS extract:
- Adjustments (exempt, outside scope):
- Reconciled turnover for VAT return:
- Evidence attached (invoice listing / POS export):

### 3. Output VAT
- Standard rated supplies @18%:
- Reduced rate supplies (7% / 5%):
- Exempt supplies:
- Cross-check against calculators (`malta_vat_2025` pack).

### 4. Input VAT
- Purchases by rate band:
- Capital goods adjustments:
- Blocked input VAT review:
- Evidence: AP ledger, import VAT documents, pro-rata calc.

### 5. EC Sales / Intrastat
- EC Sales list status (submitted/NA):
- Intrastat threshold review:

### 6. Review & approval
- Preparer: ____________________  Date: ______
- Reviewer (Manager+): ____________________  Date: ______
- Summary of issues / actions taken:

### 7. Filing package
- VAT return PDF generated: yes/no (attach to Documents module with hash)
- Payment schedule confirmed: yes/no
- Submission method: Manual / CFR Portal (stubbed)

## References
- Malta VAT Act (CAP 406)
- Calculator dominance policy (`/STANDARDS/POLICY/calculator_dominance.md`)
- Approval workflow policy (`/STANDARDS/POLICY/approval_workflow.md`)
