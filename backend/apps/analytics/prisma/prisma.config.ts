import { ANALYTICS_DB } from "config";

const sslMode = ANALYTICS_DB.SSLMODE ? "&sslmode=require" : "";

export default {
  datasources: {
    db: {
      url: `postgresql://${ANALYTICS_DB.USERNAME}:${ANALYTICS_DB.PASSWORD}@${ANALYTICS_DB.HOST}:${ANALYTICS_DB.PORT}/${ANALYTICS_DB.DB}?schema=public${sslMode}`,
    },
  },
};
