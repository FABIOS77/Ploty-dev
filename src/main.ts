import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
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
      'Gamified Project & Activity Management Platform - Backend Core REST API',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and registration endpoints')
    .addTag('Users', 'Player profile and social discovery')
    .addTag('Projects', 'Collaborative project management')
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
