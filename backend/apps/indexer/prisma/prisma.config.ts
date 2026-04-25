import { INDEXER_DB } from "config";

const sslMode = INDEXER_DB.SSLMODE ? "&sslmode=require" : "";

export default {
  datasources: {
    db: {
      url: `postgresql://${INDEXER_DB.USERNAME}:${INDEXER_DB.PASSWORD}@${INDEXER_DB.HOST}:${INDEXER_DB.PORT}/${INDEXER_DB.DB}?schema=public${sslMode}`,
    },
  },
};
