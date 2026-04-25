/**
 * Service names constants for microservices architecture
 */
export const SERVICES = {
  API_GATEWAY: "API_GATEWAY",
  KEEPER: "KEEPER",
  INDEXER: "INDEXER",
  ANALYTICS: "ANALYTICS",
} as const;

export type ServiceName = (typeof SERVICES)[keyof typeof SERVICES];
