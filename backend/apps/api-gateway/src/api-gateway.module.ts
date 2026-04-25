import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";

import { API_GATEWAY_DB, SECURITY } from "config";

import { SERVICES } from "@libs/constants";
import { DatabaseModule } from "@libs/database";
import { ExceptionsModule } from "@libs/exceptions";
import { HealthModule } from "@libs/health";

import { apiGatewayDatabaseConfig } from "./database.config";

@Module({
  imports: [
    DatabaseModule.forRoot(API_GATEWAY_DB.NAME, apiGatewayDatabaseConfig),
    ExceptionsModule.forRoot({ serverName: SERVICES.API_GATEWAY }),
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: SECURITY?.RATE_LIMIT?.WINDOW_MS || 60000,
          limit: SECURITY?.RATE_LIMIT?.MAX || 100,
        },
      ],
    }),
  ],
})
export class ApiGatewayModule {}
