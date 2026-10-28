import './env';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { requestLogger } from './http/logging';
import { initDatabase } from './db/db';

async function bootstrap() {
  await initDatabase();
  const app = await NestFactory.create(AppModule);
  const origins = process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:3100'];
  // credentials: true only pairs with the explicit origin list above, never a wildcard.
  app.enableCors({ origin: origins, credentials: true });
  app.use(requestLogger);
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
