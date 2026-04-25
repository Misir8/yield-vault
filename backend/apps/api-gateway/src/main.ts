import { API_GATEWAY, METRICS } from "config";

import { SERVICES } from "@libs/constants/services.constants";

import { bootstrap } from "../../bootstrap";
import { ApiGatewayModule } from "./api-gateway.module";

bootstrap(SERVICES.API_GATEWAY, ApiGatewayModule, API_GATEWAY.PORT, "api/v1", {
  monitoring: {
    config: METRICS,
  },
});
