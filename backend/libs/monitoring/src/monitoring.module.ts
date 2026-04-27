/**
 * Monitoring module for metrics and health checks
 * Full Prometheus integration with prom-client
 */
import { Module, DynamicModule, Global } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MonitoringConfig } from "./monitoring.types";
import { PrometheusService } from "./prometheus.service";
import { HttpMetricsInterceptor } from "./http-metrics.interceptor";
import { MetricsController } from "./metrics.controller";

/**
 * Global Monitoring Module
 */
@Global()
@Module({})
export class MonitoringModule {
  static forRoot(config: MonitoringConfig): DynamicModule {
    const prometheusServiceProvider = {
      provide: PrometheusService,
      useFactory: () => new PrometheusService(config),
    };

    return {
      module: MonitoringModule,
      providers: [
        prometheusServiceProvider,
        HttpMetricsInterceptor,
        {
          provide: "MONITORING_CONFIG",
          useValue: config,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: HttpMetricsInterceptor,
        },
      ],
      exports: [PrometheusService, HttpMetricsInterceptor, "MONITORING_CONFIG"],
    };
  }
}

/**
 * Wrap application module with monitoring
 * Adds HTTP metrics interceptor and MetricsController to the application
 */
export function wrapApplicationWithMonitoringModule(
  AppModule: any,
  serviceName: string,
  config: MonitoringConfig,
): any {
  @Module({
    imports: [AppModule, MonitoringModule.forRoot(config)],
    controllers: [MetricsController],
  })
  class MonitoredAppModule {}

  return MonitoredAppModule;
}

/**
 * Create metrics module for exposing /metrics endpoint
 * This creates a separate NestJS application for metrics
 */
export function createMetricsModule(config: MonitoringConfig): any {
  const prometheusServiceProvider = {
    provide: PrometheusService,
    useFactory: () => new PrometheusService(config),
  };

  @Module({
    controllers: [MetricsController],
    providers: [prometheusServiceProvider],
  })
  class MetricsModule {}

  return MetricsModule;
}
