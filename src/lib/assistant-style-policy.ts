import { recordClientEvent } from '@/lib/client-events';
import { systemConfig } from '@/lib/system-config';

interface AssistantMessageLike {
  role?: string;
  content?: string | null;
}

interface AssistantResponseLike {
  messages?: AssistantMessageLike[];
  actions?: Array<unknown>;
}

const DEFAULT_STYLE_RULES = [
  'Include the next two suggested actions',
  'Explain briefly (<= 480 characters)',
];

const configuredStyleRules = systemConfig.assistant_policies?.style_rules;
const styleRules =
  Array.isArray(configuredStyleRules) && configuredStyleRules.length > 0
    ? configuredStyleRules
    : DEFAULT_STYLE_RULES;
const requiresSuggestedActions = styleRules.some((rule) =>
  rule.toLowerCase().includes('next two suggested actions'),
);
const requiresBriefExplanation = styleRules.some((rule) =>
  rule.toLowerCase().includes('explain briefly'),
);

export function validateAssistantResponseStyle(payload: AssistantResponseLike): string[] {
  const violations: string[] = [];

  if (requiresSuggestedActions) {
    if (!Array.isArray(payload.actions) || payload.actions.length < 2) {
      violations.push('assistant.style.missing_next_two_actions');
    }
  }

  const assistantMessage = payload.messages?.find(
    (message) => (message.role ?? '').toLowerCase() === 'assistant',
  )?.content;

  if (requiresBriefExplanation) {
    if (typeof assistantMessage === 'string' && assistantMessage.trim().length > 480) {
      violations.push('assistant.style.explanation_too_long');
    }
  }

  if (violations.length > 0) {
    recordClientEvent({
      name: 'assistant:styleViolation',
      level: 'warn',
      data: {
        violations,
        actions: Array.isArray(payload.actions) ? payload.actions.length : 0,
        messageLength: typeof assistantMessage === 'string' ? assistantMessage.length : undefined,
      },
    });
  }

  return violations;
}
