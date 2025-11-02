import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = nonEmptyString.optional();
const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().nonnegative();

export const OrgSlugQuerySchema = z.object({
  orgSlug: nonEmptyString,
});

export const ReleaseControlsCheckSchema = z
  .object({
    orgSlug: nonEmptyString,
    engagementId: optionalNonEmptyString,
  })
  .passthrough();

export const DocumentListQuerySchema = OrgSlugQuerySchema.extend({
  limit: positiveInt.max(500).optional(),
  offset: nonNegativeInt.optional(),
  repo: optionalNonEmptyString,
  state: z.enum(['active', 'archived', 'all']).optional(),
});

export const TaskListQuerySchema = OrgSlugQuerySchema;

export const NotificationListQuerySchema = OrgSlugQuerySchema;

export const TaskIdParamsSchema = z.object({
  taskId: nonEmptyString,
});

export const NotificationIdParamsSchema = z.object({
  notificationId: nonEmptyString,
});

export const DocumentIdParamsSchema = z.object({
  documentId: nonEmptyString,
});

export const DocumentSignBodySchema = z.object({}).passthrough();
export const GenericMutationBodySchema = z.object({}).passthrough();

export const OrgScopedBodySchema = z
  .object({
    orgSlug: nonEmptyString,
  })
  .passthrough();

export const CommentBodySchema = z
  .object({
    body: nonEmptyString.optional(),
    message: nonEmptyString.optional(),
  })
  .passthrough();

export type ZodValidationResult<T> = z.SafeParseReturnType<unknown, T>;

export type ValidationErrorDetails = {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
};

export function formatValidationErrors(error: z.ZodError): ValidationErrorDetails {
  const { fieldErrors, formErrors } = error.flatten();
  return {
    fieldErrors,
    formErrors,
  };
}
