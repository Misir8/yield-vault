import { PrismaClient } from ".prisma/indexer-client";
import { INDEXER_DB } from "config";

import { PrismaConfig } from "@libs/database";
import { toBoolean } from "@libs/helpers";

const sslEnabled = toBoolean(INDEXER_DB.SSLMODE);

export const indexerDatabaseConfig: PrismaConfig = {
  clientClass: PrismaClient,
  databaseUrl: `postgresql://${INDEXER_DB.USERNAME}:${INDEXER_DB.PASSWORD}@${INDEXER_DB.HOST}:${INDEXER_DB.PORT}/${INDEXER_DB.DB}?schema=public${sslEnabled ? "&sslmode=require" : ""}`,
  logging: toBoolean(INDEXER_DB.LOGGING),
};
