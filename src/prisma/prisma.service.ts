import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { LoggingService } from '../common/services/logging.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly loggingService: LoggingService,
    private readonly configService: ConfigService,
  ) {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.loggingService.logInfo(
        'Database connection established successfully',
      );

      this.$on('query', (e) => {
        const isDevelopment =
          this.configService.get('NODE_ENV') === 'development';
        if (isDevelopment) {
          this.loggingService.logDebug('Database query executed', {
            query: { query: e.query, params: e.params },
            duration: e.duration,
          });
        }
      });

      this.$on('error', (e) => {
        this.loggingService.logError('Database error', new Error(e.message), {
          customMessage: `Target: ${e.target}`,
        });
      });

      this.$on('info', (e) => {
        this.loggingService.logInfo('Database info', {
          message: e.message,
          customMessage: `Target: ${e.target}`,
        });
      });

      this.$on('warn', (e) => {
        this.loggingService.logWarning('Database warning', {
          message: e.message,
          customMessage: `Target: ${e.target}`,
        });
      });
    } catch (error) {
      this.loggingService.logError(
        'Failed to connect to database',
        error as Error,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.loggingService.logInfo('Database connection closed');
    } catch (error) {
      this.loggingService.logError(
        'Error closing database connection',
        error as Error,
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.loggingService.logError(
        'Database health check failed',
        error as Error,
      );
      return false;
    }
  }

  async shutdown(): Promise<void> {
    this.loggingService.logInfo(
      'Initiating graceful shutdown of database connection...',
    );
    await this.onModuleDestroy();
  }
}
