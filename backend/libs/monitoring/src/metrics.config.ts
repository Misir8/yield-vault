/**
 * Service-specific metrics configuration
 */
import { MetricDefinition } from "./monitoring.types";

// Default metrics for all services
export const defaultMetrics: MetricDefinition[] = [
  {
    name: "http_requests_total",
    type: "counter",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
  },
  {
    name: "http_request_duration_seconds",
    type: "histogram",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
  },
];

// API Gateway specific metrics
export const apiGatewayMetrics: MetricDefinition[] = [
  {
    name: "api_active_connections",
    type: "gauge",
    help: "Number of active API connections",
  },
  {
    name: "api_requests_rate",
    type: "gauge",
    help: "API requests per second",
  },
];

// Keeper specific metrics
export const keeperMetrics: MetricDefinition[] = [
  {
    name: "keeper_rebalance_total",
    type: "counter",
    help: "Total number of rebalance operations",
    labelNames: ["status"],
  },
  {
    name: "keeper_liquidation_total",
    type: "counter",
    help: "Total number of liquidations",
    labelNames: ["status"],
  },
  {
    name: "keeper_gas_used",
    type: "histogram",
    help: "Gas used in keeper operations",
    labelNames: ["operation"],
  },
  {
    name: "keeper_last_run_timestamp",
    type: "gauge",
    help: "Timestamp of last keeper run",
    labelNames: ["job"],
  },
];

// Indexer specific metrics
export const indexerMetrics: MetricDefinition[] = [
  {
    name: "indexer_blocks_processed",
    type: "counter",
    help: "Total number of blocks processed",
  },
  {
    name: "indexer_events_processed",
    type: "counter",
    help: "Total number of events processed",
    labelNames: ["event_type"],
  },
  {
    name: "indexer_current_block",
    type: "gauge",
    help: "Current block being indexed",
  },
  {
    name: "indexer_lag_blocks",
    type: "gauge",
    help: "Number of blocks behind chain head",
  },
];

// Analytics specific metrics
export const analyticsMetrics: MetricDefinition[] = [
  {
    name: "analytics_tvl_usd",
    type: "gauge",
    help: "Total Value Locked in USD",
  },
  {
    name: "analytics_apy_percent",
    type: "gauge",
    help: "Current APY percentage",
  },
  {
    name: "analytics_utilization_rate",
    type: "gauge",
    help: "Protocol utilization rate",
  },
  {
    name: "analytics_active_users",
    type: "gauge",
    help: "Number of active users",
  },
];

// Export service metrics map
export const serviceMetrics: Record<string, MetricDefinition[]> = {
  default: defaultMetrics,
  "api-gateway": apiGatewayMetrics,
  keeper: keeperMetrics,
  indexer: indexerMetrics,
  analytics: analyticsMetrics,
};
