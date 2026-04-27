/**
 * Decorators for tracking custom metrics
 */
import { SetMetadata } from "@nestjs/common";

export const METRIC_COUNTER_KEY = "metric:counter";
export const METRIC_HISTOGRAM_KEY = "metric:histogram";
export const METRIC_GAUGE_KEY = "metric:gauge";

/**
 * Track method execution with counter metric
 * @param metricName - name of the counter metric
 * @param labels - optional static labels
 */
export const TrackCounter = (
  metricName: string,
  labels?: Record<string, string>,
) => SetMetadata(METRIC_COUNTER_KEY, { metricName, labels });

/**
 * Track method execution duration with histogram metric
 * @param metricName - name of the histogram metric
 * @param labels - optional static labels
 */
export const TrackHistogram = (
  metricName: string,
  labels?: Record<string, string>,
) => SetMetadata(METRIC_HISTOGRAM_KEY, { metricName, labels });

/**
 * Track gauge metric
 * @param metricName - name of the gauge metric
 * @param labels - optional static labels
 */
export const TrackGauge = (
  metricName: string,
  labels?: Record<string, string>,
) => SetMetadata(METRIC_GAUGE_KEY, { metricName, labels });
