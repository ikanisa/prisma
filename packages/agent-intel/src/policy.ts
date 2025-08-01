// Clarification policy: only ask once per session
const MAX_CLARIFY_PER_SESSION = 1;

export function shouldAskClarify(
  confidence: number,
  clarificationsAsked: number
): boolean {
  return confidence < 0.55 && clarificationsAsked < MAX_CLARIFY_PER_SESSION;
}
