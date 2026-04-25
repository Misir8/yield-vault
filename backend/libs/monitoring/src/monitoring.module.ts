/**
 * Monitoring module for metrics and health checks
 * Simplified version without complex Prometheus integration
 */
import { Module, DynamicModule, Global } from "@nestjs/common";
import { MonitoringConfig } from "./monitoring.types";

@Global()
@Module({})
export class MonitoringModule {
  static forRoot(config: MonitoringConfig): DynamicModule {
    return {
      module: MonitoringModule,
      providers: [
        {
          provide: "MONITORING_CONFIG",
          useValue: config,
        },
      ],
      exports: ["MONITORING_CONFIG"],
    };
  }
}

/**
 * Wrap application module with monitoring
 * This is a placeholder for future Prometheus integration
 */
export function wrapApplicationWithMonitoringModule(
  AppModule: any,
  serviceName: string,
  config: MonitoringConfig,
): any {
  // For now, just return the original module
  // In future, this will wrap with Prometheus metrics
  return AppModule;
}

/**
 * Create metrics module for exposing /metrics endpoint
 * This is a placeholder for future Prometheus integration
 */
export function createMetricsModule(config: MonitoringConfig): any {
  @Module({
    controllers: [],
    providers: [],
  })
  class MetricsModule {}

  return MetricsModule;
}
