import { API_GATEWAY_DB } from "config";

const sslMode = API_GATEWAY_DB.SSLMODE ? "&sslmode=require" : "";

export default {
  datasources: {
    db: {
      url: `postgresql://${API_GATEWAY_DB.USERNAME}:${API_GATEWAY_DB.PASSWORD}@${API_GATEWAY_DB.HOST}:${API_GATEWAY_DB.PORT}/${API_GATEWAY_DB.DB}?schema=public${sslMode}`,
    },
  },
};
