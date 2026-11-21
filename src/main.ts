import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers via Helmet
  app.use(helmet());

  // Safe CORS with explicit allowed origins list
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Strict Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Ploty API')
    .setDescription(
      'Gamified Project & Activity Management Platform - Backend Core REST API (Hito 1 & 2)',
    )
    .setVersion('2.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and registration endpoints')
    .addTag('Users', 'Player profile and social discovery')
    .addTag('Projects', 'Collaborative project management')
    .addTag('Activities', 'Single and recurring activities with gamified completion')
    .addTag('Gamification', 'Extreme themes, medals catalog, shop purchases and leaderboards')
    .addTag('Reports', 'Analytical data series and project visual charts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Ploty API - Interactive Swagger Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Ploty Backend Core running on: http://localhost:${port}`);
  console.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
