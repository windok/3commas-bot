import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'; // todo enable valiadtion via pipe with logging
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

// ---- bot strategy
// set price corridor for each pair
// set appropriate strategy for each pair
// check Bitcoin flows when deciding to work with other pair
// no stop loss for good coins and small SL for shitcoins

// todo sanitize webhook payload
// todo futures signals without spot->futures transferring
// todo open short positions
// todo log both in file and stdout, log with time
// optional todo when starting futures deal check that there are no active positions even for bots that are not configured in env
// todo move to docker
// todo move to cloud
// todo get rid of 3commas
// todo web configuration
// todo telegram logging
// optional todo google spreadsheet statistics
// todo hedge mode for the pair with both long and short positions

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'verbose', 'debug'],
    abortOnError: false,
  });

  const configService = app.get(ConfigService);

  await app.listen(Number.parseInt(configService.get('PORT')));
}
bootstrap();
