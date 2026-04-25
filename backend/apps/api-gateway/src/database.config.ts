import { PrismaClient } from ".prisma/api-gateway-client";
import { API_GATEWAY_DB } from "config";

import { PrismaConfig } from "@libs/database";
import { toBoolean } from "@libs/helpers";

const sslEnabled = toBoolean(API_GATEWAY_DB.SSLMODE);

export const apiGatewayDatabaseConfig: PrismaConfig = {
  clientClass: PrismaClient,
  databaseUrl: `postgresql://${API_GATEWAY_DB.USERNAME}:${API_GATEWAY_DB.PASSWORD}@${API_GATEWAY_DB.HOST}:${API_GATEWAY_DB.PORT}/${API_GATEWAY_DB.DB}?schema=public${sslEnabled ? "&sslmode=require" : ""}`,
  logging: toBoolean(API_GATEWAY_DB.LOGGING),
};
