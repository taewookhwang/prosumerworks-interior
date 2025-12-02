import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for mobile app
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 9050;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
