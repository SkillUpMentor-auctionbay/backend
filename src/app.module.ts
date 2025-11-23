import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuctionModule } from './auctions/auction.module';
import { LoggingService } from './common/services/logging.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/static',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AuctionModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [LoggingService, HttpExceptionFilter, ValidationPipe],
  exports: [LoggingService],
})
export class AppModule {}
