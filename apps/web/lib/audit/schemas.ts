import { z } from 'zod';

export const controlFrequencyEnum = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'EVENT_DRIVEN',
]);

export const controlWalkthroughResultEnum = z.enum([
  'DESIGNED',
  'NOT_DESIGNED',
  'IMPLEMENTED',
  'NOT_IMPLEMENTED',
]);

export const controlTestResultEnum = z.enum(['PASS', 'EXCEPTIONS']);

export const deficiencySeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const deficiencyStatusEnum = z.enum(['OPEN', 'MONITORING', 'CLOSED']);

export const adaRunKindEnum = z.enum(['JE', 'RATIO', 'VARIANCE', 'DUPLICATE', 'BENFORD']);
export const adaExceptionDispositionEnum = z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']);

export const createControlSchema = z.object({
  orgId: z.string().min(1),
  engagementId: z.string().min(1),
  userId: z.string().min(1),
  cycle: z.string().min(1),
  objective: z.string().min(1),
  description: z.string().min(1),
  frequency: controlFrequencyEnum.default('MONTHLY'),
  owner: z.string().min(1).optional(),
  key: z.boolean().optional().default(false),
});

export const updateControlSchema = createControlSchema
  .omit({ cycle: true, objective: true, description: true })
  .partial({ frequency: true, owner: true, key: true })
  .extend({
    controlId: z.string().min(1),
    cycle: z.string().min(1).optional(),
    objective: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  });

export const createWalkthroughSchema = z.object({
  orgId: z.string().min(1),
  controlId: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
  result: controlWalkthroughResultEnum,
});

const attributeResultSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  passed: z.boolean(),
  note: z.string().optional(),
});

export const runControlTestSchema = z
  .object({
    orgId: z.string().min(1),
    engagementId: z.string().min(1),
    controlId: z.string().min(1),
    userId: z.string().min(1),
    samplePlanRef: z.string().min(1).optional(),
    attributes: z.array(attributeResultSchema).min(1),
    result: controlTestResultEnum,
    deficiencyRecommendation: z.string().optional(),
    deficiencySeverity: deficiencySeverityEnum.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.attributes.length < 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sample size must be at least 25 items.',
        path: ['attributes'],
      });
    }
    if (
      value.result === 'EXCEPTIONS' &&
      (!value.deficiencyRecommendation || value.deficiencyRecommendation.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a recommendation when exceptions are noted.',
        path: ['deficiencyRecommendation'],
      });
    }
  });

export const createDeficiencySchema = z.object({
  orgId: z.string().min(1),
  engagementId: z.string().min(1),
  userId: z.string().min(1),
  controlId: z.string().optional(),
  recommendation: z.string().min(1),
  severity: deficiencySeverityEnum,
  status: deficiencyStatusEnum.default('OPEN'),
});

export type AttributeResultInput = z.infer<typeof attributeResultSchema>;

const journalEntrySchema = z.object({
  id: z.string().min(1),
  postedAt: z.string().min(1),
  amount: z.number(),
  account: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  approvedBy: z.string().optional(),
});

const ratioMetricSchema = z.object({
  name: z.string().min(1),
  numerator: z.number(),
  denominator: z.number(),
  prior: z.number().optional(),
  thresholdPct: z.number().nonnegative().optional(),
});

const varianceSeriesSchema = z.object({
  name: z.string().min(1),
  actual: z.number(),
  benchmark: z.number(),
  thresholdAbs: z.number().nonnegative().optional(),
  thresholdPct: z.number().nonnegative().optional(),
});

const duplicateTransactionSchema = z.object({
  id: z.string().min(1),
  amount: z.number(),
  date: z.string().min(1),
  reference: z.string().optional(),
  counterparty: z.string().optional(),
});

const benfordParamsSchema = z.object({
  figures: z.array(z.number().positive()).min(1),
});

const baseRunFields = {
  orgId: z.string().min(1),
  engagementId: z.string().min(1),
  userId: z.string().min(1),
  datasetRef: z.string().min(1),
};

export const runAdaSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('JE'),
    ...baseRunFields,
    params: z.object({
      periodEnd: z.string().min(1),
      latePostingDays: z.number().int().min(0).default(0),
      roundAmountThreshold: z.number().positive().default(1000),
      weekendFlag: z.boolean().default(true),
      entries: z.array(journalEntrySchema).min(1),
    }),
  }),
  z.object({
    kind: z.literal('RATIO'),
    ...baseRunFields,
    params: z.object({
      metrics: z.array(ratioMetricSchema).min(1),
    }),
  }),
  z.object({
    kind: z.literal('VARIANCE'),
    ...baseRunFields,
    params: z.object({
      series: z.array(varianceSeriesSchema).min(1),
    }),
  }),
  z.object({
    kind: z.literal('DUPLICATE'),
    ...baseRunFields,
    params: z.object({
      transactions: z.array(duplicateTransactionSchema).min(1),
      matchOn: z
        .array(z.enum(['amount', 'date', 'reference', 'counterparty']))
        .min(1)
        .default(['amount', 'date']),
      tolerance: z.number().nonnegative().optional(),
    }),
  }),
  z.object({
    kind: z.literal('BENFORD'),
    ...baseRunFields,
    params: benfordParamsSchema,
  }),
]);

export const updateAdaExceptionSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
  exceptionId: z.string().min(1),
  disposition: adaExceptionDispositionEnum.optional(),
  note: z.string().optional(),
  misstatementId: z.string().optional(),
});
