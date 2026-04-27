/**
 * Metrics Tracking Interceptor
 * Tracks custom metrics based on decorators
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrometheusService } from "../prometheus.service";
import {
  METRIC_COUNTER_KEY,
  METRIC_HISTOGRAM_KEY,
} from "../decorators/track-metric.decorator";

@Injectable()
export class MetricsTrackingInterceptor implements NestInterceptor {
  constructor(
    private prometheusService: PrometheusService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const counterMetadata = this.reflector.get(
      METRIC_COUNTER_KEY,
      context.getHandler(),
    );
    const histogramMetadata = this.reflector.get(
      METRIC_HISTOGRAM_KEY,
      context.getHandler(),
    );

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          if (counterMetadata) {
            this.prometheusService.incrementCounter(
              counterMetadata.metricName,
              { ...counterMetadata.labels, status: "success" },
            );
          }

          if (histogramMetadata) {
            const duration = (Date.now() - startTime) / 1000;
            this.prometheusService.observeHistogram(
              histogramMetadata.metricName,
              duration,
              { ...histogramMetadata.labels, status: "success" },
            );
          }
        },
        error: () => {
          if (counterMetadata) {
            this.prometheusService.incrementCounter(
              counterMetadata.metricName,
              { ...counterMetadata.labels, status: "error" },
            );
          }

          if (histogramMetadata) {
            const duration = (Date.now() - startTime) / 1000;
            this.prometheusService.observeHistogram(
              histogramMetadata.metricName,
              duration,
              { ...histogramMetadata.labels, status: "error" },
            );
          }
        },
      }),
    );
  }
}
