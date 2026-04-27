export const DEFAULT_ALLOWED_HOSTS: RegExp[] = [
  /^localhost$/i,
  /^127\.0\.0\.1$/i,
  /^\[?::1\]?$/i,
  /^[a-z0-9-]+$/i, // single-label: ledgerapi, treasure, etc.
  /\.svc(?:\.cluster\.local)?$/i, // k8s service DNS
  /\.cluster\.local$/i,
  /\.internal$/i,
  /^192\.168\.(?:\d{1,3})\.(?:\d{1,3})$/,
  /^10\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})$/,
  /^172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3})\.(?:\d{1,3})$/,
];

export const DEFAULT_ALLOWED_PORTS = ["8080"];

export const INTERNAL_SERVICE_HOSTS = [
  "ledgerapi",
  "treasure",
  "customer-service",
  "payment-service",
  "ramp",
  "rate",
  "admin",
  "capitalsync",
  "antifraud",
  "paypulse",
];
