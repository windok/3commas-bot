import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import ThreeCommasClient from './services/threeCommasClient';
import ThreeCommasManager from './services/threeCommasManager';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService, ThreeCommasClient, ThreeCommasManager],
})
export class AppModule {}
