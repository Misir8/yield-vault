import {
  DynamicModule,
  Global,
  Injectable,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { AppLogger } from "@libs/logger";

export interface PrismaConfig {
  databaseUrl: string;
  logging?: boolean;
  clientClass: any;
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(name: string, config: PrismaConfig): DynamicModule {
    const token = `${name}PrismaClient`;

    return {
      module: DatabaseModule,
      providers: [
        {
          provide: token,
          useFactory: async () => {
            const adapter = new PrismaPg({
              connectionString: config.databaseUrl,
            });

            const prisma = new config.clientClass({
              adapter,
              log: config.logging
                ? ["query", "info", "warn", "error"]
                : ["error"],
            });

            await prisma.$connect();
            return prisma;
          },
        },
        {
          provide: DatabaseShutdownService,
          useFactory: (prisma: any) =>
            new DatabaseShutdownService(prisma, name),
          inject: [token],
        },
      ],
      exports: [token],
    };
  }
}

@Injectable()
class DatabaseShutdownService implements OnApplicationShutdown {
  private readonly logger = new AppLogger("DatabaseShutdownService");

  constructor(
    private readonly prisma: any,
    private readonly name: string,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.log(`${this.name} database connection closed`);
    } catch (error) {
      this.logger.error(
        `Error closing ${this.name} database connection: ${error.message}`,
      );
    }
  }
}
