// apps/bootstrap.ts
import { randomUUID } from "node:crypto";

import { NestFactory, Reflector } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as Sentry from "@sentry/nestjs";
import * as express from "express";
import helmet from "helmet";

import { SWAGGER } from "config";

import { CORS } from "@libs/constants";
import { ClassValidationPipe } from "@libs/exceptions/pipes/validation.pipe";
import { SentryService } from "@libs/exceptions/sentry.service";
import { AppLogger, LoggingInterceptor } from "@libs/logger";
import type { MonitoringConfig } from "@libs/monitoring";
import {
  createMetricsModule,
  wrapApplicationWithMonitoringModule,
} from "@libs/monitoring";
import { serviceMetrics } from "@libs/monitoring/metrics.config";

import type { INestApplication } from "@nestjs/common";
import type { NestApplicationOptions } from "@nestjs/common/interfaces/nest-application-options.interface";

export async function bootstrap(
  service: string,
  application: any,
  port: number,
  path: string,
  opts?: {
    options?: NestApplicationOptions;
    extensions?: (app: INestApplication) => void;
    monitoring?: Omit<MonitoringConfig, "appLabel" | "metrics">;
  },
  swaggerApi: string = "",
): Promise<void> {
  const sentryService = new SentryService(service);
  const logger = new AppLogger("app");

  try {
    const isAppWithMetrics = Boolean(opts?.monitoring?.config?.ENABLED);

    const appModule = isAppWithMetrics
      ? wrapApplicationWithMonitoringModule(application, service, {
          appLabel: service,
          metrics: [
            ...serviceMetrics.default,
            ...(serviceMetrics[service.toLowerCase()] || []),
          ],
          config: opts.monitoring?.config,
          REQUESTS_PROCESSING_RATE:
            opts.monitoring?.config?.REQUESTS_PROCESSING_RATE,
        })
      : application;

    const app = await NestFactory.create<NestExpressApplication>(appModule, {
      bodyParser: false,
      ...(opts?.options ?? {}),
    });

    app.enableShutdownHooks();

    app.use(
      express.json({
        limit: "1mb",
        verify: (req: any, res, buf) => {
          const url = req.url || "";
          if (url.includes("/webhook")) {
            req.rawBody = buf;
          }
        },
      }),
    );
    app.use(express.urlencoded({ limit: "1mb", extended: true }));

    app.enableCors(CORS);
    app.useGlobalInterceptors(new LoggingInterceptor(app.get(Reflector)));
    app.setGlobalPrefix(path);

    app.use(helmet());

    if (SWAGGER.ENABLED) {
      const swaggerOptions = new DocumentBuilder()
        .setTitle(`PayPilot API ${service}`)
        .addGlobalParameters(
          {
            name: "X-Request-Id",
            in: "header",
            required: false,
            schema: { type: "string", example: randomUUID() },
            description: "Optional request id for http tracing",
          },
          {
            name: "X-Trace-Id",
            in: "header",
            required: false,
            schema: { type: "string", example: randomUUID() },
            description: "Optional request id for e2e tracing",
          },
        )
        .addBearerAuth()
        .build();
      const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions);
      const docsPath = swaggerApi ? `${swaggerApi}/docs` : `${path}/docs`;
      SwaggerModule.setup(docsPath, app, swaggerDocument, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    if (isAppWithMetrics) {
      logger.log(
        `${service} Metrics available at http://localhost:${port}${path}/metrics`,
      );
    }

    app.useGlobalPipes(new ClassValidationPipe());

    await app.listen(port);
    logger.log(`${service} port: ${port}`);
  } catch (error) {
    logger.error(`Failed to start ${service}: ${error?.message || error}`);
    try {
      sentryService.error(error as Error, { phase: "bootstrap", service }, [
        "bootstrap",
        "fatal",
      ]);
      await Sentry.flush(2000);
    } catch {
      /* empty */
    }

    throw error;
  }
}
