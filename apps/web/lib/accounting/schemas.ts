import { z } from 'zod';

const uuid = z.string().uuid();

export const accountImportSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  userId: uuid,
  accounts: z.array(
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      type: z.string().min(1),
      currency: z.string().min(1).default('EUR'),
      active: z.boolean().optional(),
      parentAccountId: uuid.optional(),
    })
  ),
});

export const ledgerEntriesImportSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  userId: uuid,
  periodId: uuid.optional(),
  entries: z.array(
    z.object({
      accountId: uuid,
      date: z.string(),
      debit: z.number().nonnegative(),
      credit: z.number().nonnegative(),
      description: z.string().nullable().optional(),
      currency: z.string().min(1).default('EUR'),
      fxRate: z.number().nullable().optional(),
      source: z.enum(['SUBLEDGER', 'IMPORT', 'JOURNAL', 'ADJUSTMENT']).optional(),
      batchId: uuid.optional(),
    })
  ),
});

export const fsMapApplySchema = z.object({
  orgId: uuid,
  entityId: uuid,
  userId: uuid,
  basis: z.string().default('IFRS_EU'),
  mappings: z.array(
    z.object({
      accountId: uuid,
      fsLineId: uuid,
      effectiveFrom: z.string().nullable().optional(),
      effectiveTo: z.string().nullable().optional(),
    })
  ),
});

export const createJournalBatchSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid.optional(),
  preparedByUserId: uuid,
  ref: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  attachmentId: uuid.nullable().optional(),
});

export const addJournalLinesSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  userId: uuid,
  batchId: uuid,
  periodId: uuid.optional(),
  lines: z.array(
    z.object({
      accountId: uuid,
      date: z.string(),
      description: z.string().nullable().optional(),
      debit: z.number().nonnegative(),
      credit: z.number().nonnegative(),
      currency: z.string().min(1).default('EUR'),
      fxRate: z.number().nullable().optional(),
    })
  ).min(1),
});

export const submitJournalSchema = z.object({
  orgId: uuid,
  batchId: uuid,
  userId: uuid,
});

export const approveJournalSchema = z.object({
  orgId: uuid,
  batchId: uuid,
  userId: uuid,
});

export const postJournalSchema = approveJournalSchema;

export const createReconciliationSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  engagementId: uuid.optional(),
  type: z.string(),
  controlAccountId: uuid.nullable().optional(),
  externalBalance: z.number(),
  preparedByUserId: uuid,
});

export const addReconciliationItemSchema = z.object({
  orgId: uuid,
  reconciliationId: uuid,
  item: z.object({
    category: z.string(),
    amount: z.number(),
    reference: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    resolved: z.boolean().optional(),
  }),
});

export const closeReconciliationSchema = z.object({
  orgId: uuid,
  reconciliationId: uuid,
  userId: uuid,
  scheduleDocumentId: uuid.nullable().optional(),
});

export const trialBalanceSnapshotSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
});

export const varianceRunSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
});

export const fxRemeasureSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
  rates: z.record(z.string(), z.number().positive()).optional(),
});

export const instantiatePbcSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
  templateKey: z.string().default('default'),
});

export const advanceCloseSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
  nextStatus: z.enum(['SUBSTANTIVE_REVIEW', 'READY_TO_LOCK']),
});

export const lockCloseSchema = z.object({
  orgId: uuid,
  entityId: uuid,
  periodId: uuid,
  userId: uuid,
});

export type AccountImportInput = z.infer<typeof accountImportSchema>;
export type LedgerEntriesImportInput = z.infer<typeof ledgerEntriesImportSchema>;
export type FsMapApplyInput = z.infer<typeof fsMapApplySchema>;
export type CreateJournalBatchInput = z.infer<typeof createJournalBatchSchema>;
export type AddJournalLinesInput = z.infer<typeof addJournalLinesSchema>;
export type SubmitJournalInput = z.infer<typeof submitJournalSchema>;
export type ApproveJournalInput = z.infer<typeof approveJournalSchema>;
export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type AddReconciliationItemInput = z.infer<typeof addReconciliationItemSchema>;
export type CloseReconciliationInput = z.infer<typeof closeReconciliationSchema>;
export type TrialBalanceSnapshotInput = z.infer<typeof trialBalanceSnapshotSchema>;
export type VarianceRunInput = z.infer<typeof varianceRunSchema>;
export type FxRemeasureInput = z.infer<typeof fxRemeasureSchema>;
export type InstantiatePbcInput = z.infer<typeof instantiatePbcSchema>;
export type AdvanceCloseInput = z.infer<typeof advanceCloseSchema>;
export type LockCloseInput = z.infer<typeof lockCloseSchema>;
