/** Simple DLP moderation helper. Throws if sensitive patterns are detected. */
export function moderateInput(text: string) {
  // naive check for numbers resembling SSN or credit card
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
  const ccPattern = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/;
  if (ssnPattern.test(text) || ccPattern.test(text)) {
    throw new Error("DLP violation detected");
  }
}
