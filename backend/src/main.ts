import './env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initDatabase } from './db/db';

async function bootstrap() {
  await initDatabase();
  const app = await NestFactory.create(AppModule);
  const origins = process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:3100'];
  app.enableCors({ origin: origins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
