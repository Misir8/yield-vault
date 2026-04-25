/**
 * Monitoring configuration types
 */

export interface MonitoringConfig {
  appLabel: string;
  metrics: MetricDefinition[];
  config?: {
    ENABLED: boolean;
    EXPOSE_PORT?: number;
    REQUESTS_PROCESSING_RATE?: number;
  };
  REQUESTS_PROCESSING_RATE?: number;
}

export interface MetricDefinition {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  help: string;
  labelNames?: string[];
}
