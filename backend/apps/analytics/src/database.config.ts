import { PrismaClient } from ".prisma/analytics-client";
import { ANALYTICS_DB } from "config";

import { PrismaConfig } from "@libs/database";
import { toBoolean } from "@libs/helpers";

const sslEnabled = toBoolean(ANALYTICS_DB.SSLMODE);

export const analyticsDatabaseConfig: PrismaConfig = {
  clientClass: PrismaClient,
  databaseUrl: `postgresql://${ANALYTICS_DB.USERNAME}:${ANALYTICS_DB.PASSWORD}@${ANALYTICS_DB.HOST}:${ANALYTICS_DB.PORT}/${ANALYTICS_DB.DB}?schema=public${sslEnabled ? "&sslmode=require" : ""}`,
  logging: toBoolean(ANALYTICS_DB.LOGGING),
};
