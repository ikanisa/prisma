/**
 * Input Validation for Tools
 * 
 * Validates tool inputs against JSON schemas
 */

import type { ToolDefinition, ToolInputSchema } from './types';

/**
 * Validate input against tool schema
 */
export function validateToolInput(
  tool: ToolDefinition,
  input: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const schema = tool.inputSchema;

  // Check required fields
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (!(requiredField in input) || input[requiredField] === undefined || input[requiredField] === null) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
  }

  // Validate field types and constraints
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const value = input[fieldName];

      // Skip if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      const fieldDef = fieldSchema as Record<string, unknown>;

      // Type validation
      if (fieldDef.type) {
        const expectedType = fieldDef.type as string;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Field ${fieldName} must be an array`);
        } else if (expectedType !== 'array' && actualType !== expectedType) {
          errors.push(`Field ${fieldName} must be of type ${expectedType}, got ${actualType}`);
        }
      }

      // Enum validation
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        errors.push(
          `Field ${fieldName} must be one of: ${(fieldDef.enum as unknown[]).join(', ')}`
        );
      }

      // String length validation (basic)
      if (fieldDef.type === 'string' && typeof value === 'string') {
        if ((fieldDef.minLength as number) && value.length < (fieldDef.minLength as number)) {
          errors.push(`Field ${fieldName} must be at least ${fieldDef.minLength} characters`);
        }
        if ((fieldDef.maxLength as number) && value.length > (fieldDef.maxLength as number)) {
          errors.push(`Field ${fieldName} must be at most ${fieldDef.maxLength} characters`);
        }
      }

      // Number range validation
      if (fieldDef.type === 'number' && typeof value === 'number') {
        if ((fieldDef.minimum as number) !== undefined && value < (fieldDef.minimum as number)) {
          errors.push(`Field ${fieldName} must be at least ${fieldDef.minimum}`);
        }
        if ((fieldDef.maximum as number) !== undefined && value > (fieldDef.maximum as number)) {
          errors.push(`Field ${fieldName} must be at most ${fieldDef.maximum}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize input (remove unknown fields if additionalProperties is false)
 */
export function sanitizeToolInput(
  tool: ToolDefinition,
  input: Record<string, unknown>
): Record<string, unknown> {
  const schema = tool.inputSchema;
  const sanitized: Record<string, unknown> = {};

  // If additionalProperties is false, only allow known properties
  if (schema.additionalProperties === false && schema.properties) {
    for (const fieldName of Object.keys(schema.properties)) {
      if (fieldName in input) {
        sanitized[fieldName] = input[fieldName];
      }
    }
    return sanitized;
  }

  // Otherwise, return input as-is (but could add more sanitization)
  return input;
}

