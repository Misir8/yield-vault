/**
 * Convert various values to boolean
 */
export function toBoolean(value: any): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return /^(true|1|yes|on)$/i.test(value.trim());
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return Boolean(value);
}
