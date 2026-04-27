/**
 * Prometheus Service
 * Manages Prometheus registry and metrics
 */
import { Injectable } from "@nestjs/common";
import * as promClient from "prom-client";
import { MonitoringConfig, MetricDefinition } from "./monitoring.types";

@Injectable()
export class PrometheusService {
  public readonly registry: promClient.Registry;
  private metrics: Map<string, any> = new Map();

  constructor(private config: MonitoringConfig) {
    this.registry = new promClient.Registry();

    this.registry.setDefaultLabels({
      app: config.appLabel,
    });

    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: `${config.appLabel}_`,
    });

    this.initializeMetrics(config.metrics);
  }

  private initializeMetrics(definitions: MetricDefinition[]): void {
    for (const def of definitions) {
      const metricName = `${this.config.appLabel}_${def.name}`;

      switch (def.type) {
        case "counter":
          this.metrics.set(
            def.name,
            new promClient.Counter({
              name: metricName,
              help: def.help,
              labelNames: def.labelNames || [],
              registers: [this.registry],
            }),
          );
          break;

        case "gauge":
          this.metrics.set(
            def.name,
            new promClient.Gauge({
              name: metricName,
              help: def.help,
              labelNames: def.labelNames || [],
              registers: [this.registry],
            }),
          );
          break;

        case "histogram":
          this.metrics.set(
            def.name,
            new promClient.Histogram({
              name: metricName,
              help: def.help,
              labelNames: def.labelNames || [],
              buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
              registers: [this.registry],
            }),
          );
          break;

        case "summary":
          this.metrics.set(
            def.name,
            new promClient.Summary({
              name: metricName,
              help: def.help,
              labelNames: def.labelNames || [],
              percentiles: [0.5, 0.9, 0.95, 0.99],
              registers: [this.registry],
            }),
          );
          break;
      }
    }
  }

  /**
   * Get metric by name
   */
  getMetric<T = any>(name: string): T | undefined {
    return this.metrics.get(name);
  }

  /**
   * Increment counter
   */
  incrementCounter(
    name: string,
    labels?: Record<string, string | number>,
  ): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof promClient.Counter) {
      metric.inc(labels);
    }
  }

  /**
   * Set gauge value
   */
  setGauge(
    name: string,
    value: number,
    labels?: Record<string, string | number>,
  ): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof promClient.Gauge) {
      metric.set(labels || {}, value);
    }
  }

  /**
   * Observe histogram value
   */
  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string | number>,
  ): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof promClient.Histogram) {
      metric.observe(labels || {}, value);
    }
  }

  /**
   * Observe summary value
   */
  observeSummary(
    name: string,
    value: number,
    labels?: Record<string, string | number>,
  ): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof promClient.Summary) {
      metric.observe(labels || {}, value);
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return this.registry.contentType;
  }
}
