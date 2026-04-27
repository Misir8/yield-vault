/**
 * Helper type to convert Date fields to string for HTTP responses
 * Used to derive provider DTOs from Response DTOs
 */
export type DateToString<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};
