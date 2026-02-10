import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
  // console.log("SERVICE_ROLE exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
