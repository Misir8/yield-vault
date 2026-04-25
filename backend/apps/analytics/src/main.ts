import { ANALYTICS, METRICS } from "config";

import { SERVICES } from "@libs/constants/services.constants";

import { bootstrap } from "../../bootstrap";

import { AnalyticsModule } from "./analytics.module";

bootstrap(
  SERVICES.ANALYTICS,
  AnalyticsModule,
  ANALYTICS.PORT,
  "api/v1/analytics",
  {
    monitoring: {
      config: METRICS,
    },
  },
);
