/**
 * WEALTHOVERS V2: AI PII & Sensitive Financial Data Sanitizer
 * Pre-processes prompts and financial context before dispatch to cloud LLM providers.
 */

export function sanitizeFinancialPrompt(text: string): string {
  if (!text) return "";

  let sanitized = text;

  // Mask email addresses first
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");

  // Mask Indian mobile numbers (with optional +91 prefix)
  sanitized = sanitized.replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, "[PHONE_REDACTED]");

  // Mask Indian PAN card format (5 uppercase letters, 4 numbers, 1 letter)
  sanitized = sanitized.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, "[PAN_REDACTED]");

  // Mask 12-digit Aadhaar number
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[AADHAAR_REDACTED]");

  // Mask bank account numbers (10 to 18 digits) retaining last 4 digits
  sanitized = sanitized.replace(/\b\d{6,14}(\d{4})\b/g, "XXXX-XXXX-$1");

  return sanitized;
}

export function maskAccountNumber(accNumber?: string | null): string {
  if (!accNumber) return "XXXX";
  const clean = accNumber.trim();
  if (clean.length <= 4) return clean;
  return `XXXX-${clean.slice(-4)}`;
}
