import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { formatValidationErrors } from './common/validators/validation.util';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: formatValidationErrors(errors),
        }),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dark Horse Safety API')
    .setDescription(
      'Admin auth APIs (email/password login, Google OAuth, password reset, invites) and CRM APIs (customers, contacts, locations, pricing/requirements/form/route rules, EOD reports, sales activities, quotes, saved views, lookups).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('health', 'Service health')
    .addTag('auth', 'Authentication & account flows')
    .addTag('crm-dashboard', 'CRM overview dashboard')
    .addTag('crm-customers', 'CRM customers / accounts')
    .addTag('crm-contacts', 'CRM contacts')
    .addTag('crm-locations', 'CRM locations / wells')
    .addTag('crm-pricing-rules', 'CRM pricing rules')
    .addTag('crm-requirements', 'CRM customer requirements')
    .addTag('crm-form-rules', 'CRM required form rules')
    .addTag('crm-route-rules', 'CRM route / GPS rules')
    .addTag('crm-eod-reports', 'CRM EOD reports')
    .addTag('crm-sales-activities', 'CRM sales activities')
    .addTag('crm-quotes', 'CRM quotes')
    .addTag('crm-saved-views', 'CRM saved list views')
    .addTag('crm-lookups', 'CRM form lookups / autocomplete')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
    customSiteTitle: 'Dark Horse Safety API Docs',
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}
void bootstrap();
