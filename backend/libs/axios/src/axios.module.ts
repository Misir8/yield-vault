import { Global, Module } from "@nestjs/common";

import { AxiosService } from "./axios.service";

@Global()
@Module({
  providers: [
    {
      provide: AxiosService,
      useFactory: () =>
        new AxiosService({
          retries: 3,
          timeout: 10000,
        }),
    },
  ],
  exports: [AxiosService],
})
export class AxiosModule {}
