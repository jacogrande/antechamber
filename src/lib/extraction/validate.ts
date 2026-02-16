import type { FieldDefinition, ExtractedFieldValue } from '../../types/domain';
import type { ValidationIssue } from './types';
import { safeRegexTest } from '../validation/regex';
import { createLogger } from '../logger';

const log = createLogger('extraction:validate');

/**
 * Validate a single extracted field value against its schema definition.
 * Skips validation for unknown status or null values.
 */
export function validateField(
  field: FieldDefinition,
  extracted: ExtractedFieldValue,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (extracted.status === 'unknown' || extracted.value === null) {
    return issues;
  }

  const value = extracted.value;

  // Type check
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        issues.push({
          key: field.key,
          type: 'type',
          message: `Expected string, got ${typeof value}`,
        });
        return issues;
      }
      break;
    case 'number':
      if (typeof value !== 'number') {
        issues.push({
          key: field.key,
          type: 'type',
          message: `Expected number, got ${typeof value}`,
        });
        return issues;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        issues.push({
          key: field.key,
          type: 'type',
          message: `Expected boolean, got ${typeof value}`,
        });
        return issues;
      }
      break;
    case 'enum':
      if (typeof value !== 'string') {
        issues.push({
          key: field.key,
          type: 'type',
          message: `Expected string (enum), got ${typeof value}`,
        });
        return issues;
      }
      break;
    case 'string[]':
      if (!Array.isArray(value)) {
        issues.push({
          key: field.key,
          type: 'type',
          message: `Expected string[], got ${typeof value}`,
        });
        return issues;
      }
      break;
  }

  // String-specific validations
  if (typeof value === 'string') {
    const validation = field.validation;

    if (validation?.regex) {
      try {
        const { matched, timedOut } = safeRegexTest(validation.regex, value);
        if (timedOut) {
          // Regex took too long — possible ReDoS pattern, skip validation
          log.warn('Regex validation timed out', { key: field.key, pattern: validation.regex });
        } else if (!matched) {
          issues.push({
            key: field.key,
            type: 'regex',
            message: `Value "${value}" does not match pattern ${validation.regex}`,
          });
        }
      } catch {
        // Invalid regex in field definition — skip check gracefully
      }
    }

    if (validation?.minLen !== undefined && value.length < validation.minLen) {
      issues.push({
        key: field.key,
        type: 'minLen',
        message: `Value length ${value.length} is below minimum ${validation.minLen}`,
      });
    }

    if (validation?.maxLen !== undefined && value.length > validation.maxLen) {
      issues.push({
        key: field.key,
        type: 'maxLen',
        message: `Value length ${value.length} exceeds maximum ${validation.maxLen}`,
      });
    }
  }

  // Enum membership check
  if (field.type === 'enum' && field.enumOptions?.length && typeof value === 'string') {
    const match = field.enumOptions.some(
      (opt) => opt.toLowerCase() === value.toLowerCase(),
    );
    if (!match) {
      issues.push({
        key: field.key,
        type: 'enum',
        message: `Value "${value}" is not a valid option. Valid: ${field.enumOptions.join(', ')}`,
      });
    }
  }

  return issues;
}

/**
 * Validate all extracted fields against their schema definitions.
 */
export function validateAllFields(
  fields: FieldDefinition[],
  extracted: ExtractedFieldValue[],
): ValidationIssue[] {
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const issues: ValidationIssue[] = [];

  for (const ext of extracted) {
    const field = fieldMap.get(ext.key);
    if (!field) continue;
    issues.push(...validateField(field, ext));
  }

  return issues;
}

/**
 * Demote extracted fields to needs_review if they have validation issues.
 * Returns a new array; does not mutate the input.
 */
export function applyValidationResults(
  extracted: ExtractedFieldValue[],
  issues: ValidationIssue[],
): ExtractedFieldValue[] {
  const issuesByKey = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const existing = issuesByKey.get(issue.key);
    if (existing) {
      existing.push(issue);
    } else {
      issuesByKey.set(issue.key, [issue]);
    }
  }

  return extracted.map((field) => {
    const fieldIssues = issuesByKey.get(field.key);
    if (!fieldIssues?.length) return field;

    const reasons = fieldIssues.map((i) => i.message).join('; ');
    const existingReason = field.reason ? `${field.reason}; ` : '';

    return {
      ...field,
      status: 'needs_review' as const,
      reason: existingReason + reasons,
    };
  });
}
