/**
 * Type for the redaction handler function.
 */
type RedactionHandler = (value: string) => string;

/**
 * Configuration for sensitive data redaction.
 */
interface RedactionConfig {
  keys: readonly string[];
  handlers: Map<string, RedactionHandler>;
}

/**
 * HTTP log sanitization options.
 */
export interface HttpLogSanitizeOptions {
  maxDepth?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;
  maxApproxBytes?: number;
}

/**
 * Internal state used while building a bounded HTTP log preview.
 */
type HttpLogSanitizeState = {
  remainingBudget: number;
  truncated: boolean;
  seen: WeakSet<object>;
};

/**
 * Plain object alias.
 */
type PlainObject = Record<string, unknown>;

const HTTP_LOG_TRUNCATED_MARKER = "[Truncated]";
const HTTP_LOG_MAX_DEPTH_MARKER = "[Truncated: max depth reached]";

/**
 * Default options for HTTP log sanitization.
 */
export const DEFAULT_HTTP_LOG_SANITIZE_OPTIONS: Required<HttpLogSanitizeOptions> =
  {
    maxDepth: 4,
    maxArrayItems: 20,
    maxObjectKeys: 50,
    maxStringLength: 1000,
    maxApproxBytes: 32 * 1024,
  };

/**
 * List of sensitive keys that should be redacted.
 * All keys are stored in lowercase for case-insensitive matching.
 */
const SENSITIVE_KEYS = [
  // Card-related fields
  "cardNumber",
  "number",
  "cardExpirationDate",
  "expiryDate",
  "cvc2",
  "cvv",
  "cavv",
  "eci",
  "tokenPan",
  "onlinePaymentCryptogram",

  // 3DS fields
  "threeDSMethodData",
  "threeDSMethodURL",
  "transactionXId",

  // Address fields
  "cardholderBillingAddressCountry",
  "cardholderBillingAddressState",
  "cardholderBillingAddressCity",
  "cardholderBillingAddressLine1",
  "cardholderBillingAddressLine2",
  "cardholderBillingAddressLine3",
  "cardholderBillingAddressPostalCode",
  "street",
  "houseNumber",
  // 'city',
  "postalCode",
  "province",

  // Authentication fields
  "password",
  "newPassword",
  "oldPassword",
  "proposedPassword",
  "previousPassword",
  "merchantPassword",
  "merchant_password",
  "password3ds",

  // Token/API fields
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "cert",
  "x-api-key",
  "responseUrl",
  "authorization",
  "bearer",
  "jwt",
  "sessionId",
  "session_id",

  // Secret fields
  "secret",
  "clientSecret",
  "client_secret",
  "privateKey",
  "private_key",
  "signature",

  // Personal data
  // 'document_number',
  // 'person_code',
  "addressIp",
  "client_ip",
] as const;

/**
 * Default redaction handler - replaces value with '***'.
 */
const defaultRedactionHandler: RedactionHandler = () => "***";

/**
 * Card number redaction handler - shows last 4 digits.
 *
 * @param {string} value Card number to redact.
 * @returns {string} Redacted card number in format '*** XXXX'.
 */
const cardNumberRedactionHandler: RedactionHandler = (
  value: string,
): string => {
  if (!value || typeof value !== "string") {
    return "***";
  }

  return value.length > 4 ? `*** ${value.slice(-4)}` : "***";
};

/**
 * Creates a redaction configuration with handlers.
 *
 * @returns {RedactionConfig} Redaction config.
 */
const createRedactionConfig = (): RedactionConfig => {
  const normalizedKeys = SENSITIVE_KEYS.map((key) => key.toLowerCase());

  const handlers = new Map<string, RedactionHandler>();
  handlers.set("cardnumber", cardNumberRedactionHandler);

  return {
    keys: normalizedKeys,
    handlers,
  };
};

/**
 * Shared immutable config for all redaction operations.
 */
const REDACTION_CONFIG = createRedactionConfig();

/**
 * Fast exact-match lookup for sensitive keys.
 */
const SENSITIVE_KEY_SET = new Set(REDACTION_CONFIG.keys);

/**
 * Safely clones an object using JSON serialization.
 *
 * @template T
 * @param {T} data Data to clone.
 * @returns {{ cloned: T; success: boolean }} Object with cloned data and success flag.
 */
const safeClone = <T>(data: T): { cloned: T; success: boolean } => {
  try {
    return {
      cloned: JSON.parse(JSON.stringify(data)) as T,
      success: true,
    };
  } catch {
    return {
      cloned: data,
      success: false,
    };
  }
};

/**
 * Checks if a value is a plain object (not null, not array, not primitive).
 *
 * @param {unknown} value Value to check.
 * @returns {value is Record<string, unknown>} True if value is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Gets the appropriate redaction handler for a given key.
 *
 * @param {string} key Key to check.
 * @param {RedactionConfig} config Redaction configuration.
 * @returns {RedactionHandler} Redaction handler function.
 */
const getRedactionHandler = (
  key: string,
  config: RedactionConfig,
): RedactionHandler => {
  const lowerKey = key.toLowerCase();

  for (const [pattern, handler] of config.handlers.entries()) {
    if (lowerKey.includes(pattern)) {
      return handler;
    }
  }

  return defaultRedactionHandler;
};

/**
 * Recursively redacts sensitive data in an object.
 *
 * @param {unknown} obj Object to redact.
 * @param {RedactionConfig} config Redaction configuration.
 * @returns {void}
 */
const redactObject = (obj: unknown, config: RedactionConfig): void => {
  if (!obj) {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => redactObject(item, config));
    return;
  }

  if (!isPlainObject(obj)) {
    return;
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const lowerKey = key.toLowerCase();

    if (config.keys.includes(lowerKey) && typeof value === "string") {
      const handler = getRedactionHandler(key, config);
      obj[key] = handler(value);
      continue;
    }

    if (typeof value === "object" && value !== null) {
      redactObject(value, config);
    }
  }
};

/**
 * Marks the sanitization state as truncated.
 *
 * @param {HttpLogSanitizeState} state Sanitization state.
 * @returns {void}
 */
const markTruncated = (state: HttpLogSanitizeState): void => {
  state.truncated = true;
};

/**
 * Spends approximate budget units for log serialization.
 *
 * @param {HttpLogSanitizeState} state Sanitization state.
 * @param {number} amount Approximate cost.
 * @returns {boolean} True if budget is still available.
 */
const spendBudget = (state: HttpLogSanitizeState, amount: number): boolean => {
  state.remainingBudget -= amount;
  if (state.remainingBudget >= 0) {
    return true;
  }

  markTruncated(state);
  return false;
};

/**
 * Truncates a string for log preview.
 *
 * @param {string} value Input string.
 * @param {number} maxStringLength Maximum allowed length.
 * @param {HttpLogSanitizeState} state Sanitization state.
 * @returns {string} Original or truncated string.
 */
const sanitizeStringForLog = (
  value: string,
  maxStringLength: number,
  state: HttpLogSanitizeState,
): string => {
  const next =
    value.length > maxStringLength
      ? `${value.slice(0, maxStringLength)}...(truncated, originalLength=${value.length})`
      : value;

  if (next !== value) {
    markTruncated(state);
  }

  spendBudget(state, next.length + 2);
  return next;
};

/**
 * Builds a minimal wrapper for truncated log payloads.
 *
 * @param {unknown} preview Preview payload.
 * @returns {Record<string, unknown>} Wrapped payload.
 */
const wrapTruncatedPreview = (preview: unknown): Record<string, unknown> => ({
  __logSummary: { truncated: true },
  preview,
});

/**
 * Returns a string representation for non-plain objects.
 *
 * @param {unknown} value Input value.
 * @returns {string} Stable string representation.
 */
const renderSpecialObject = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (value && typeof value === "object" && "constructor" in value) {
    const ctorName =
      typeof (value as { constructor?: { name?: unknown } }).constructor
        ?.name === "string"
        ? (value as { constructor: { name: string } }).constructor.name
        : "Object";

    return `[${ctorName}]`;
  }

  return String(value);
};

/**
 * Sanitizes an arbitrary value for HTTP logs in a single bounded pass.
 *
 * The function:
 * - clones only the preview that will be logged,
 * - redacts sensitive keys,
 * - truncates large strings,
 * - limits depth, array items and object keys,
 * - stops early when approximate budget is exhausted.
 *
 * Small payloads are returned without extra metadata.
 * Truncated payloads are wrapped into `{ __logSummary, preview }`.
 *
 * @param {unknown} value Input value.
 * @param {number} depth Current recursion depth.
 * @param {HttpLogSanitizeState} state Shared sanitization state.
 * @param {Required<HttpLogSanitizeOptions>} options Sanitization options.
 * @param {string} [keyHint] Optional parent key for redaction checks.
 * @returns {unknown} Sanitized value.
 */
const sanitizeValueForHttpLog = (
  value: unknown,
  depth: number,
  state: HttpLogSanitizeState,
  options: Required<HttpLogSanitizeOptions>,
  keyHint?: string,
): unknown => {
  if (state.remainingBudget <= 0) {
    markTruncated(state);
    return HTTP_LOG_TRUNCATED_MARKER;
  }

  if (keyHint && SENSITIVE_KEY_SET.has(keyHint.toLowerCase())) {
    if (typeof value === "string") {
      const handler = getRedactionHandler(keyHint, REDACTION_CONFIG);
      const redacted = handler(value);
      spendBudget(state, redacted.length + keyHint.length + 4);
      return redacted;
    }

    spendBudget(state, 8);
    return "***";
  }

  if (value == null) {
    spendBudget(state, 4);
    return value;
  }

  if (typeof value === "string") {
    return sanitizeStringForLog(value, options.maxStringLength, state);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    spendBudget(state, 16);
    return value;
  }

  if (typeof value === "bigint") {
    const asString = value.toString();
    spendBudget(state, asString.length + 2);
    return asString;
  }

  if (typeof value !== "object") {
    const rendered = String(value);
    spendBudget(state, rendered.length + 2);
    return rendered;
  }

  if (state.seen.has(value as object)) {
    markTruncated(state);
    spendBudget(state, 12);
    return "[Circular]";
  }

  state.seen.add(value as object);

  if (depth >= options.maxDepth) {
    markTruncated(state);
    spendBudget(state, HTTP_LOG_MAX_DEPTH_MARKER.length + 2);
    return HTTP_LOG_MAX_DEPTH_MARKER;
  }

  if (Array.isArray(value)) {
    spendBudget(state, 2);

    const result: unknown[] = [];
    const limit = Math.min(value.length, options.maxArrayItems);

    for (let index = 0; index < limit; index += 1) {
      result.push(
        sanitizeValueForHttpLog(value[index], depth + 1, state, options),
      );
      if (state.remainingBudget <= 0) {
        break;
      }
    }

    if (value.length > limit) {
      markTruncated(state);
      result.push(`[... ${value.length - limit} more items truncated]`);
      spendBudget(state, 32);
    }

    return result;
  }

  if (!isPlainObject(value)) {
    const rendered = renderSpecialObject(value);
    spendBudget(state, rendered.length + 2);
    return rendered;
  }

  spendBudget(state, 2);

  const result: PlainObject = {};
  const keys = Object.keys(value);
  const limit = Math.min(keys.length, options.maxObjectKeys);

  for (let index = 0; index < limit; index += 1) {
    const key = keys[index];
    spendBudget(state, key.length + 4);

    result[key] = sanitizeValueForHttpLog(
      value[key],
      depth + 1,
      state,
      options,
      key,
    );

    if (state.remainingBudget <= 0) {
      break;
    }
  }

  if (keys.length > limit) {
    markTruncated(state);
    result.__truncatedKeys = keys.length - limit;
    spendBudget(state, 24);
  }

  return result;
};

/**
 * Produces a safe HTTP log payload with minimal overhead.
 *
 * Compared to `redactSensitiveData`, this helper is designed for hot HTTP logging paths:
 * it avoids JSON stringify/parse cloning and performs redaction + truncation in one pass.
 *
 * Small payloads preserve their original shape.
 * Truncated payloads are wrapped into `{ __logSummary, preview }`.
 *
 * @param {unknown} data Input payload.
 * @param {HttpLogSanitizeOptions} [options] Sanitization options.
 * @returns {unknown} Sanitized payload.
 */
export const sanitizeHttpLogPayload = (
  data: unknown,
  options?: HttpLogSanitizeOptions,
): unknown => {
  const resolvedOptions: Required<HttpLogSanitizeOptions> = {
    ...DEFAULT_HTTP_LOG_SANITIZE_OPTIONS,
    ...options,
  };

  const normalized = data ?? {};
  const state: HttpLogSanitizeState = {
    remainingBudget: resolvedOptions.maxApproxBytes,
    truncated: false,
    seen: new WeakSet<object>(),
  };

  const preview = sanitizeValueForHttpLog(
    normalized,
    0,
    state,
    resolvedOptions,
  );

  return state.truncated ? wrapTruncatedPreview(preview) : preview;
};

/**
 * Redacts sensitive data from an object by replacing sensitive field values
 * with redacted placeholders.
 *
 * This function preserves the existing behavior:
 * - deep clones via JSON serialization,
 * - recursively walks arrays and plain objects,
 * - redacts only string values under sensitive keys.
 *
 * @template T
 * @param {T} data Data to redact (can be object, array, or primitive).
 * @returns {T} Cloned data with sensitive fields redacted.
 */
export const redactSensitiveData = <T = unknown>(data: T): T => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const { cloned, success } = safeClone(data);

  if (!success) {
    return cloned;
  }

  redactObject(cloned, REDACTION_CONFIG);

  return cloned;
};
