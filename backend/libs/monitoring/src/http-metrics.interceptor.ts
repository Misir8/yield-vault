/**
 * HTTP Metrics Interceptor
 * Automatically tracks HTTP request metrics
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrometheusService } from "./prometheus.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(context, startTime, "success");
        },
        error: () => {
          this.recordMetrics(context, startTime, "error");
        },
      }),
    );
  }

  private recordMetrics(
    context: ExecutionContext,
    startTime: number,
    status: string,
  ): void {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const duration = (Date.now() - startTime) / 1000;

    const labels = {
      method: request.method,
      route: request.route?.path || request.url,
      status: response.statusCode?.toString() || status,
    };

    // Increment request counter
    this.prometheusService.incrementCounter("http_requests_total", labels);

    // Observe request duration
    this.prometheusService.observeHistogram(
      "http_request_duration_seconds",
      duration,
      labels,
    );
  }
}
