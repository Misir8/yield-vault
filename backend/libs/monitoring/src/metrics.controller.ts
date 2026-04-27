/**
 * Metrics Controller
 * Exposes /metrics endpoint for Prometheus scraping
 */
import { Controller, Get, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Response } from "express";
import { PrometheusService } from "./prometheus.service";
import { SkipLogging } from "@libs/logger";

@Controller()
@ApiExcludeController()
export class MetricsController {
  constructor(private prometheusService: PrometheusService) {}

  @Get("/metrics")
  @SkipLogging()
  async getMetrics(@Res() response: Response): Promise<void> {
    const metrics = await this.prometheusService.getMetrics();
    response.set("Content-Type", this.prometheusService.getContentType());
    response.send(metrics);
  }
}
