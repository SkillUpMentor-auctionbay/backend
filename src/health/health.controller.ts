import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'auction-bay-api',
    };
  }

  @Get('database')
  async getDatabaseHealth() {
    const isHealthy = await this.databaseService.testConnection();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auction-bay-api',
      database: {
        connected: isHealthy,
      },
    };
  }

  @Get('database/test')
  async getDatabaseTest() {
    const connectionTest = await this.databaseService.testConnection();
    const userCrudTest = await this.databaseService.testUserCRUD();
    const auctionBidTest = await this.databaseService.testAuctionAndBidCRUD();

    return {
      status: connectionTest && userCrudTest.success && auctionBidTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auction-bay-api',
      tests: {
        connection: { passed: connectionTest },
        userCrud: userCrudTest,
        auctionBidCrud: auctionBidTest,
      },
    };
  }
}